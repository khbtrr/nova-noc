import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.models.device import Device, DeviceType
from app.models.remediation_log import RemediationLog, RemediationActionType, RemediationChannel, RemediationStatus
from app.models.alert import Alert
from app.services.icmp_service import ping_host, parse_mikrotik_ping_results
from app.notifications.websocket import manager

logger = logging.getLogger("nova.remediation_service")

def _get_routeros_api(device: Device):
    """Helper to connect to RouterOS API via librouteros."""
    from librouteros import connect
    port = device.port or 8728
    return connect(
        username=device.username or "admin",
        password=device.password or "",
        host=device.host,
        port=port,
        timeout=6
    )

async def execute_remediation(
    db: AsyncSession,
    device_id: int,
    action_type: str,
    target: str = "global",
    trigger_channel: str = "DASHBOARD",
    executed_by: str = "admin"
) -> Dict[str, Any]:
    """
    Executes a verified, safe mitigation action on a network device.
    Records the operation in remediation_logs audit trail and broadcasts status.
    """
    now = datetime.now(timezone.utc)
    
    # 1. Fetch device
    dev_res = await db.execute(select(Device).filter(Device.id == device_id))
    device = dev_res.scalar_one_or_none()
    if not device:
        return {"success": False, "message": f"Perangkat ID #{device_id} tidak ditemukan."}

    action_enum = getattr(RemediationActionType, action_type.upper(), RemediationActionType.RUN_DIAGNOSTICS)
    channel_enum = getattr(RemediationChannel, trigger_channel.upper(), RemediationChannel.DASHBOARD)
    
    status = RemediationStatus.SUCCESS
    output_details = ""

    try:
        if action_enum == RemediationActionType.FLUSH_DNS:
            if device.device_type == DeviceType.MIKROTIK:
                def run_flush():
                    api = _get_routeros_api(device)
                    api('/ip/dns/cache/flush')
                await asyncio.to_thread(run_flush)
                output_details = f"Berhasil membersihkan cache DNS router {device.name} (/ip dns cache flush)."
            else:
                output_details = f"Aksi Flush DNS dicatat dan dievaluasi untuk perangkat {device.name}."

        elif action_enum == RemediationActionType.RESTART_INTERFACE:
            if device.device_type == DeviceType.MIKROTIK:
                target_iface = target if target and target != "global" else "sfplus1-JLM"
                def run_cycle():
                    api = _get_routeros_api(device)
                    # Find matching interface
                    matched = None
                    for item in api('/interface/print'):
                        if str(item.get('name')) == target_iface:
                            matched = item
                            break
                    if not matched:
                        raise ValueError(f"Interface '{target_iface}' tidak ditemukan pada router.")
                    
                    item_id = matched.get('.id')
                    # Disable interface
                    api('/interface/disable', numbers=item_id)
                    import time
                    time.sleep(2)
                    # Re-enable interface
                    api('/interface/enable', numbers=item_id)

                await asyncio.to_thread(run_cycle)
                output_details = f"Interface '{target}' berhasil di-restart sesaat (disable -> jeda 2 detik -> enable) pada router {device.name}."
            else:
                output_details = f"Restart interface '{target}' disimulasikan untuk switch SNMP {device.name}."

        elif action_enum == RemediationActionType.RUN_DIAGNOSTICS:
            # Measure Server-to-Device ICMP ping
            stat = await ping_host(device.host, count=4, timeout=1.0)
            latency = stat.get("latency_ms", 0.0)
            loss = stat.get("packet_loss", 0.0)

            # Measure Router-to-WAN Ping if MikroTik
            wan_text = ""
            if device.device_type == DeviceType.MIKROTIK:
                def run_wan():
                    api = _get_routeros_api(device)
                    raw = list(api('/tool/ping', address='8.8.8.8', count=3))
                    return parse_mikrotik_ping_results(raw)
                try:
                    wan_stat = await asyncio.to_thread(run_wan)
                    wan_text = f" | WAN Gateway: {wan_stat.get('wan_latency_ms', 0):.1f} ms (Loss: {wan_stat.get('wan_packet_loss', 0)}%)"
                except Exception as wan_err:
                    wan_text = f" | WAN Ping: Gagal ({wan_err})"

            output_details = f"Hasil Diagnostik Uji Jalur: Latensi Server ke Router: {latency:.1f} ms (Loss: {loss:.0f}%){wan_text}."

        elif action_enum == RemediationActionType.ACKNOWLEDGE:
            # 1. Acknowledge database alerts
            await db.execute(
                Alert.__table__.update().where(
                    (Alert.device_id == device_id) & (Alert.is_acknowledged == False)
                ).values(is_acknowledged=True, acknowledged_at=now)
            )
            # 2. Clear active traffic anomaly in NOVA Sight
            from app.services.anomaly_service import clear_anomaly
            clear_anomaly(device_id)
            output_details = f"Seluruh alert aktif untuk perangkat {device.name} telah di-acknowledge dan status anomali NOVA Sight diselesaikan."

    except Exception as err:
        logger.error(f"[NOVA Act] Error executing {action_type} on {device.name}: {err}")
        status = RemediationStatus.FAILED
        output_details = f"Gagal mengeksekusi aksi: {str(err)}"

    # 2. Record to Database Audit Log
    log_entry = RemediationLog(
        device_id=device_id,
        action_type=action_enum,
        target=target,
        trigger_channel=channel_enum,
        executed_by=executed_by,
        status=status,
        output_details=output_details,
        created_at=now
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)

    # 3. Broadcast execution via WebSocket
    ws_payload = json.dumps({
        "event": "remediation_executed",
        "data": {
            "id": log_entry.id,
            "device_id": device_id,
            "device_name": device.name,
            "action_type": action_enum.value,
            "target": target,
            "status": status.value,
            "executed_by": executed_by,
            "trigger_channel": channel_enum.value,
            "output_details": output_details,
            "created_at": now.isoformat()
        }
    })
    await manager.broadcast(ws_payload)

    return {
        "success": (status == RemediationStatus.SUCCESS),
        "log_id": log_entry.id,
        "action_type": action_enum.value,
        "status": status.value,
        "message": output_details
    }

async def get_remediation_logs(db: AsyncSession, limit: int = 50) -> List[Dict[str, Any]]:
    """Fetch recent remediation audit trail logs across all devices."""
    res = await db.execute(
        select(RemediationLog, Device.name.label("device_name"), Device.host.label("device_host"))
        .join(Device, RemediationLog.device_id == Device.id)
        .order_by(desc(RemediationLog.created_at))
        .limit(limit)
    )
    rows = res.all()
    logs = []
    for log, dev_name, dev_host in rows:
        logs.append({
            "id": log.id,
            "device_id": log.device_id,
            "device_name": dev_name,
            "device_host": dev_host,
            "action_type": log.action_type.value,
            "target": log.target,
            "trigger_channel": log.trigger_channel.value,
            "executed_by": log.executed_by,
            "status": log.status.value,
            "output_details": log.output_details,
            "created_at": log.created_at.isoformat()
        })
    return logs

async def get_device_remediation_logs(db: AsyncSession, device_id: int, limit: int = 30) -> List[Dict[str, Any]]:
    """Fetch remediation logs for a specific device."""
    res = await db.execute(
        select(RemediationLog)
        .filter(RemediationLog.device_id == device_id)
        .order_by(desc(RemediationLog.created_at))
        .limit(limit)
    )
    rows = res.scalars().all()
    return [{
        "id": r.id,
        "device_id": r.device_id,
        "action_type": r.action_type.value,
        "target": r.target,
        "trigger_channel": r.trigger_channel.value,
        "executed_by": r.executed_by,
        "status": r.status.value,
        "output_details": r.output_details,
        "created_at": r.created_at.isoformat()
    } for r in rows]
