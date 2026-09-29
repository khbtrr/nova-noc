import asyncio
import re
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.future import select
from sqlalchemy import desc, func, delete

from app.config import settings
from app.database import async_session_maker
from app.models.syslog import SyslogMessage
from app.models.device import Device
from app.models.alert import Alert, AlertSeverity
from app.notifications.websocket import manager

logger = logging.getLogger("nova.syslog")

FACILITIES = {
    0: "kernel", 1: "user", 2: "mail", 3: "daemon",
    4: "auth", 5: "syslog", 6: "lpr", 7: "news",
    8: "uucp", 9: "cron", 10: "authpriv", 11: "ftp",
    12: "ntp", 13: "security", 14: "console", 15: "solaris-cron",
    16: "local0", 17: "local1", 18: "local2", 19: "local3",
    20: "local4", 21: "local5", 22: "local6", 23: "local7"
}

SEVERITIES = {
    0: "EMERGENCY",
    1: "ALERT",
    2: "CRITICAL",
    3: "ERROR",
    4: "WARNING",
    5: "NOTICE",
    6: "INFO",
    7: "DEBUG"
}

# Cache device mapping: ip_str -> (device_id, device_name)
_device_ip_cache: Dict[str, Tuple[int, str]] = {}
_last_cache_refresh: float = 0.0

# Flapping/deduplication for critical syslog alerts: (device_id, key) -> last_alert_time
_syslog_alert_cooldowns: Dict[Tuple[int, str], datetime] = {}

async def _refresh_device_cache():
    global _device_ip_cache, _last_cache_refresh
    now = datetime.now(timezone.utc).timestamp()
    if now - _last_cache_refresh < 30.0 and _device_ip_cache:
        return
    try:
        async with async_session_maker() as db:
            res = await db.execute(select(Device.id, Device.name, Device.host))
            rows = res.all()
            new_cache = {}
            for dev_id, name, host in rows:
                if host:
                    new_cache[host.strip()] = (dev_id, name)
            _device_ip_cache = new_cache
            _last_cache_refresh = now
    except Exception as e:
        logger.debug(f"Failed to refresh device IP cache for syslog: {e}")

def parse_syslog_datagram(data: bytes, source_ip: str) -> Dict[str, Any]:
    """Parse an RFC 3164 Syslog datagram sent from MikroTik or standard syslog daemon."""
    raw = data.decode("utf-8", errors="replace").strip()
    
    facility = "daemon"
    severity = "INFO"
    topic = None
    message = raw
    timestamp = datetime.now(timezone.utc)
    
    # 1. Parse PRI: <PRI>
    pri_match = re.match(r"^<(\d{1,3})>(.*)$", raw, re.DOTALL)
    if pri_match:
        pri = int(pri_match.group(1))
        fac_num = pri // 8
        sev_num = pri % 8
        facility = FACILITIES.get(fac_num, f"local{fac_num}")
        severity = SEVERITIES.get(sev_num, "INFO")
        message = pri_match.group(2).strip()

    # 2. Parse MikroTik Topic & Timestamp
    # MikroTik format examples:
    # "sep/28 11:30:00 system,error,critical login failure for user admin"
    # "172.16.18.2 interface,info ether1 link down"
    # "firewall,info forward: in:ether1 out:bridge"
    tokens = message.split(" ", 2)
    if len(tokens) >= 2:
        # Check if first token is month/date e.g. sep/28
        if "/" in tokens[0] and ":" in tokens[1]:
            # Has timestamp prefix: sep/28 11:30:00
            remainder = tokens[2] if len(tokens) > 2 else ""
            subparts = remainder.split(" ", 1)
            candidate_topic = subparts[0]
            if any(t in candidate_topic for t in ["system", "interface", "firewall", "dhcp", "ospf", "warning", "error", "info", "critical", "account"]):
                topic = candidate_topic
                message = subparts[1] if len(subparts) > 1 else remainder
            else:
                message = remainder
        elif any(t in tokens[0] for t in ["system", "interface", "firewall", "dhcp", "ospf", "warning", "error", "info", "critical", "account", ","]):
            topic = tokens[0]
            message = " ".join(tokens[1:])

    # Clean up topic trailing colon
    if topic and topic.endswith(":"):
        topic = topic[:-1]

    # Elevate severity if MikroTik topic explicitly declares error or critical
    if topic:
        t_lower = topic.lower()
        if "critical" in t_lower:
            severity = "CRITICAL"
        elif "error" in t_lower and severity in ["INFO", "NOTICE", "DEBUG"]:
            severity = "ERROR"
        elif "warning" in t_lower and severity in ["INFO", "NOTICE", "DEBUG"]:
            severity = "WARNING"

    return {
        "host": source_ip,
        "facility": facility,
        "severity": severity,
        "topic": topic,
        "message": message,
        "timestamp": timestamp
    }

async def process_syslog_message(parsed: Dict[str, Any]):
    """Store message, check critical alert trigger, and broadcast to WebSocket."""
    await _refresh_device_cache()
    
    source_ip = parsed["host"]
    device_info = _device_ip_cache.get(source_ip)
    device_id = device_info[0] if device_info else None
    device_name = device_info[1] if device_info else f"Perangkat ({source_ip})"

    now = datetime.now(timezone.utc)

    # 1. Save to PostgreSQL
    try:
        async with async_session_maker() as db:
            log_entry = SyslogMessage(
                device_id=device_id,
                host=source_ip,
                facility=parsed["facility"],
                severity=parsed["severity"],
                topic=parsed["topic"],
                message=parsed["message"],
                timestamp=parsed["timestamp"],
                created_at=now
            )
            db.add(log_entry)
            await db.commit()
            await db.refresh(log_entry)
            log_id = log_entry.id
    except Exception as e:
        logger.error(f"Error persisting syslog message from {source_ip}: {e}")
        log_id = int(now.timestamp())

    # 2. Check for Automatic Critical Incident Alerting
    sev = parsed["severity"].upper()
    msg_lower = parsed["message"].lower()
    is_critical_event = (
        sev in ["EMERGENCY", "ALERT", "CRITICAL"] or
        "kernel failure" in msg_lower or
        "reboot" in msg_lower or
        "link down" in msg_lower or
        "login failure" in msg_lower
    )

    if is_critical_event and device_id:
        cooldown_key = (device_id, parsed.get("topic") or parsed["message"][:30])
        last_alert = _syslog_alert_cooldowns.get(cooldown_key)
        
        if not last_alert or (now - last_alert) > timedelta(minutes=5):
            _syslog_alert_cooldowns[cooldown_key] = now
            alert_severity = AlertSeverity.CRITICAL if sev in ["EMERGENCY", "ALERT", "CRITICAL"] else AlertSeverity.WARNING
            alert_msg = f"[Syslog {sev}] {parsed.get('topic') or 'System'}: {parsed['message']}"

            try:
                async with async_session_maker() as db:
                    alert = Alert(
                        device_id=device_id,
                        severity=alert_severity,
                        metric_name="syslog",
                        metric_value=1.0,
                        threshold_value=1.0,
                        message=alert_msg,
                        created_at=now,
                        is_resolved=False
                    )
                    db.add(alert)
                    await db.commit()

                    # Send to Telegram
                    from app.notifications.telegram_worker import enqueue_telegram_message
                    tele_text = (
                        f"🚨 <b>SYSLOG ALERT: {alert_severity.value}</b>\n\n"
                        f"📍 <b>Perangkat:</b> {device_name} ({source_ip})\n"
                        f"🏷️ <b>Topik:</b> {parsed.get('topic') or '-'}\n"
                        f"⚠️ <b>Pesan:</b> {parsed['message']}\n"
                        f"⏰ <b>Waktu:</b> {now.strftime('%Y-%m-%d %H:%M:%S UTC')}"
                    )
                    await enqueue_telegram_message(tele_text)
            except Exception as alert_err:
                logger.warning(f"Error creating alert from syslog: {alert_err}")

    # 3. Broadcast real-time syslog event to frontend
    ws_payload = json.dumps({
        "event": "syslog_event",
        "data": {
            "id": log_id,
            "device_id": device_id,
            "device_name": device_name,
            "host": source_ip,
            "facility": parsed["facility"],
            "severity": parsed["severity"],
            "topic": parsed["topic"],
            "message": parsed["message"],
            "timestamp": parsed["timestamp"].isoformat(),
            "created_at": now.isoformat()
        }
    })
    await manager.broadcast(ws_payload)

class SyslogProtocol(asyncio.DatagramProtocol):
    def __init__(self):
        super().__init__()

    def connection_made(self, transport):
        self.transport = transport
        logger.info(f"Syslog UDP Listener active on port {settings.SYSLOG_UDP_PORT}")

    def datagram_received(self, data: bytes, addr: Tuple[str, int]):
        source_ip = addr[0]
        try:
            parsed = parse_syslog_datagram(data, source_ip)
            asyncio.create_task(process_syslog_message(parsed))
        except Exception as e:
            logger.error(f"Error handling syslog datagram from {source_ip}: {e}")

    def error_received(self, exc):
        logger.warning(f"Syslog UDP listener received error: {exc}")

_syslog_transport = None

async def start_syslog_server():
    """Start the UDP Syslog Receiver background server."""
    global _syslog_transport
    port = settings.SYSLOG_UDP_PORT or 514
    loop = asyncio.get_running_loop()
    try:
        transport, _ = await loop.create_datagram_endpoint(
            lambda: SyslogProtocol(),
            local_addr=("0.0.0.0", port)
        )
        _syslog_transport = transport
        logger.info(f"Syslog UDP Server successfully bound to 0.0.0.0:{port}")
    except Exception as e:
        logger.error(f"Failed to start Syslog UDP Server on port {port}: {e}")

def stop_syslog_server():
    """Stop the UDP Syslog Receiver."""
    global _syslog_transport
    if _syslog_transport:
        _syslog_transport.close()
        _syslog_transport = None
        logger.info("Syslog UDP Server stopped.")

async def cleanup_old_syslogs(retention_days: int = 7) -> int:
    """Scheduled cleanup of syslog messages older than retention_days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    try:
        async with async_session_maker() as db:
            res = await db.execute(delete(SyslogMessage).filter(SyslogMessage.created_at < cutoff))
            await db.commit()
            deleted = res.rowcount or 0
            if deleted > 0:
                logger.info(f"Syslog Retention: Cleaned up {deleted} log records older than {retention_days} days.")
            return deleted
    except Exception as e:
        logger.error(f"Failed to clean up old syslog messages: {e}")
        return 0
