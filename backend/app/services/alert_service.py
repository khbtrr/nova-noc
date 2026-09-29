import json
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.alert import Alert, AlertSeverity
from app.models.alert_rule import AlertRule
from app.models.device import Device
from app.schemas.alert import AlertRuleCreate, AlertRuleUpdate
from app.notifications.telegram import send_telegram_message
from app.notifications.websocket import manager
from app.core.exceptions import NotFoundException

logger = logging.getLogger("nova.alert_service")

# Cooldown tracking: (device_id, rule_id, severity_str) -> last_alert_time
_recent_alerts = {}

# Flapping suppression for auto-recovery: (device_id, metric_name) -> consecutive_normal_cycles
_recovery_counters = {}

async def evaluate_metrics(db: AsyncSession, device_id: int, metrics: dict):
    # Fetch rules for this device or global rules
    result = await db.execute(
        select(AlertRule).filter(
            (AlertRule.device_id == device_id) | (AlertRule.device_id == None)
        ).filter(AlertRule.is_enabled == True)
    )
    rules = result.scalars().all()
    
    # Get device info for message
    dev_res = await db.execute(select(Device).filter(Device.id == device_id))
    device = dev_res.scalar_one_or_none()
    device_name = device.name if device else f"Device #{device_id}"
    host = device.host if device else "unknown"

    now = datetime.now(timezone.utc)
    
    for rule in rules:
        metric_key = rule.metric_name
        if metric_key in metrics and metrics[metric_key] is not None:
            try:
                val = float(metrics[metric_key])
            except (ValueError, TypeError):
                continue
                
            severity: Optional[AlertSeverity] = None
            threshold_hit = 0.0
            
            if rule.condition == "gt":
                if val >= rule.critical_threshold:
                    severity = AlertSeverity.CRITICAL
                    threshold_hit = rule.critical_threshold
                elif val >= rule.warning_threshold:
                    severity = AlertSeverity.WARNING
                    threshold_hit = rule.warning_threshold
            elif rule.condition == "lt":
                if val <= rule.critical_threshold:
                    severity = AlertSeverity.CRITICAL
                    threshold_hit = rule.critical_threshold
                elif val <= rule.warning_threshold:
                    severity = AlertSeverity.WARNING
                    threshold_hit = rule.warning_threshold

            recovery_key = (device_id, metric_key)

            if severity:
                # Metric violated threshold -> reset recovery counter
                _recovery_counters[recovery_key] = 0

                # Check cooldown (avoid spamming alert every 30s)
                cache_key = (device_id, rule.id, severity.value)
                last_time = _recent_alerts.get(cache_key)
                if last_time and (now - last_time) < timedelta(minutes=5):
                    continue  # Still in cooldown
                
                _recent_alerts[cache_key] = now
                msg = f"[{severity.value}] {device_name} ({host}): {metric_key} mencapai {val:.1f} (Threshold: {threshold_hit:.1f})"
                
                alert = Alert(
                    device_id=device_id,
                    alert_rule_id=rule.id,
                    severity=severity,
                    metric_name=metric_key,
                    metric_value=val,
                    threshold_value=threshold_hit,
                    message=msg,
                    is_acknowledged=False,
                    is_resolved=False,
                    created_at=now
                )
                db.add(alert)
                await db.commit()
                await db.refresh(alert)
                
                # Push via WebSocket
                ws_payload = json.dumps({
                    "event": "alert_triggered",
                    "data": {
                        "id": alert.id,
                        "device_id": device_id,
                        "device_name": device_name,
                        "severity": severity.value,
                        "metric_name": metric_key,
                        "metric_value": val,
                        "message": msg,
                        "created_at": now.isoformat()
                    }
                })
                await manager.broadcast(ws_payload)
                
                # Send to Telegram
                tg_msg = f"🚨 *NOVA Alert*\nPerangkat: *{device_name}* ({host})\nSeverity: *{severity.value}*\nMetric: `{metric_key}` = {val:.1f}\nPesan: {msg}"
                await send_telegram_message(tg_msg)

            else:
                # Metric is normal (severity is None).
                # Check if there are active, unresolved alerts for this device and metric.
                active_alerts_res = await db.execute(
                    select(Alert).filter(
                        Alert.device_id == device_id,
                        Alert.metric_name == metric_key,
                        Alert.is_resolved == False
                    )
                )
                active_alerts = list(active_alerts_res.scalars().all())

                if active_alerts:
                    consecutive_count = _recovery_counters.get(recovery_key, 0) + 1
                    _recovery_counters[recovery_key] = consecutive_count

                    # Flapping suppression: must persist healthy for at least 2 consecutive polling cycles
                    if consecutive_count >= 2:
                        for act_alert in active_alerts:
                            act_alert.is_resolved = True
                            act_alert.resolved_at = now
                        await db.commit()

                        # Reset recovery counter and clean recent alert cooldowns
                        _recovery_counters.pop(recovery_key, None)
                        for sev_val in [AlertSeverity.CRITICAL.value, AlertSeverity.WARNING.value]:
                            _recent_alerts.pop((device_id, rule.id, sev_val), None)

                        # Send Telegram Recovery notification
                        recov_msg = (
                            f"✅ *NOVA Alert Recovered*\n"
                            f"Perangkat: *{device_name}* ({host})\n"
                            f"Status: *NORMAL* (Pemulihan Otomatis)\n"
                            f"Metric: `{metric_key}` telah kembali normal pada {val:.1f}"
                        )
                        await send_telegram_message(recov_msg)

                        # Broadcast WebSocket event
                        ws_payload = json.dumps({
                            "event": "alert_resolved",
                            "data": {
                                "device_id": device_id,
                                "device_name": device_name,
                                "metric_name": metric_key,
                                "metric_value": val,
                                "resolved_at": now.isoformat()
                            }
                        })
                        await manager.broadcast(ws_payload)

async def get_alerts(db: AsyncSession, active_only: bool = True) -> List[Alert]:
    query = select(Alert)
    if active_only:
        query = query.filter(Alert.is_acknowledged == False, Alert.is_resolved == False)
    query = query.order_by(Alert.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())

async def get_alert_history(db: AsyncSession, limit: int = 100) -> List[Alert]:
    query = select(Alert).order_by(Alert.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())

async def acknowledge_alert(db: AsyncSession, alert_id: int, user_id: Optional[int] = None) -> Alert:
    result = await db.execute(select(Alert).filter(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise NotFoundException("Alert not found")
        
    alert.is_acknowledged = True
    alert.is_resolved = True
    alert.acknowledged_by = user_id
    alert.acknowledged_at = datetime.now(timezone.utc)
    alert.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(alert)
    return alert


async def get_alert_rules(db: AsyncSession) -> List[AlertRule]:
    result = await db.execute(select(AlertRule).order_by(AlertRule.id))
    return result.scalars().all()

async def create_alert_rule(db: AsyncSession, rule_in: AlertRuleCreate) -> AlertRule:
    rule = AlertRule(**rule_in.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule

async def update_alert_rule(db: AsyncSession, rule_id: int, rule_in: AlertRuleUpdate) -> AlertRule:
    result = await db.execute(select(AlertRule).filter(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise NotFoundException("Alert rule not found")
        
    for k, v in rule_in.model_dump(exclude_unset=True).items():
        setattr(rule, k, v)
    await db.commit()
    await db.refresh(rule)
    return rule

async def delete_alert_rule(db: AsyncSession, rule_id: int):
    result = await db.execute(select(AlertRule).filter(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise NotFoundException("Alert rule not found")
        
    # Unlink alerts pointing to this rule so foreign key constraint is satisfied
    from sqlalchemy import update
    await db.execute(
        update(Alert).filter(Alert.alert_rule_id == rule_id).values(alert_rule_id=None)
    )
    
    await db.delete(rule)
    await db.commit()
