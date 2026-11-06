import asyncio
import json
import logging
import math
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from app.config import settings
from app.notifications.websocket import manager

logger = logging.getLogger("nova.anomaly_service")

_active_anomalies: Dict[int, Dict[str, Any]] = {}
_anomaly_history: List[Dict[str, Any]] = []
_candidate_anomalies: Dict[int, Dict[str, Any]] = {}
_cooldowns: Dict[int, datetime] = {}

def get_active_anomalies() -> List[Dict[str, Any]]:
    return list(_active_anomalies.values())

def get_anomaly_history(limit: int = 20) -> List[Dict[str, Any]]:
    return _anomaly_history[-limit:]

def clear_anomaly(device_id: int):
    if device_id in _active_anomalies:
        resolved = _active_anomalies.pop(device_id)
        resolved["status"] = "RESOLVED"
        resolved["resolved_at"] = datetime.now(timezone.utc).isoformat()
        _anomaly_history.append(resolved)
        logger.info(f"[NOVA Sight] Traffic anomaly for device #{device_id} marked as RESOLVED.")
        asyncio.create_task(manager.broadcast(json.dumps({
            "event": "traffic_anomaly_resolved",
            "data": {
                "device_id": device_id,
                "resolved_at": resolved["resolved_at"]
            }
        })))

async def evaluate_traffic_anomaly(
    device_id: int,
    device_name: str,
    current_metrics: Dict[str, Any],
    history_buffer: List[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    now = datetime.now(timezone.utc)

    rx_kbps = float(current_metrics.get("rx_kbps", 0.0) or 0.0)
    tx_kbps = float(current_metrics.get("tx_kbps", 0.0) or 0.0)
    current_total_mbps = round((rx_kbps + tx_kbps) / 1000.0, 2)
    rx_mbps = round(rx_kbps / 1000.0, 2)
    tx_mbps = round(tx_kbps / 1000.0, 2)

    if not history_buffer or len(history_buffer) < 5:
        return None

    past_points = history_buffer[-30:]
    past_rates = [
        ((float(p.get("rx_kbps", 0.0) or 0.0) + float(p.get("tx_kbps", 0.0) or 0.0)) / 1000.0)
        for p in past_points
    ]

    mean_mbps = sum(past_rates) / len(past_rates)
    variance = sum((r - mean_mbps) ** 2 for r in past_rates) / len(past_rates)
    std_dev = math.sqrt(variance)

    detected_type: Optional[str] = None
    severity: str = "WARNING"
    reason: str = ""

    z_score = (current_total_mbps - mean_mbps) / max(std_dev, 0.5)
    if (current_total_mbps >= mean_mbps * 2.2 and (current_total_mbps - mean_mbps) >= 5.0) or z_score >= 2.8:
        detected_type = "TRAFFIC_SPIKE"
        severity = "CRITICAL" if (current_total_mbps >= mean_mbps * 3.5 or z_score >= 4.0) else "WARNING"
        reason = f"Lonjakan trafik mendadak {current_total_mbps:.1f} Mbps (Rata-rata: {mean_mbps:.1f} Mbps, Z-Score: {z_score:.1f})"

    elif mean_mbps >= 10.0 and current_total_mbps <= (mean_mbps * 0.2):
        detected_type = "TRAFFIC_DROP"
        severity = "CRITICAL"
        reason = f"Penurunan trafik drastis ke {current_total_mbps:.1f} Mbps (Rata-rata: {mean_mbps:.1f} Mbps, Drop: >80%)"

    else:
        jlm_loss = float(current_metrics.get("jlm_packet_loss", 0.0) or 0.0)
        jlm_status = str(current_metrics.get("jlm_status", "UP")).upper()
        ion_loss = float(current_metrics.get("ion_packet_loss", 0.0) or 0.0)
        ion_status = str(current_metrics.get("ion_status", "UP")).upper()

        if jlm_loss >= 25.0 or jlm_status == "DOWN":
            detected_type = "WAN_DEGRADATION_JLM"
            severity = "CRITICAL"
            reason = f"Uplink {settings.WAN_PRIMARY_NAME} ({settings.WAN_PRIMARY_INTERFACE}) mengalami gangguan: Packet loss {jlm_loss:.0f}%, Status: {jlm_status}"
        elif ion_loss >= 25.0 or ion_status == "DOWN":
            detected_type = "WAN_DEGRADATION_ION"
            severity = "CRITICAL"
            reason = f"Uplink {settings.WAN_SECONDARY_NAME} ({settings.WAN_SECONDARY_INTERFACE}) mengalami gangguan: Packet loss {ion_loss:.0f}%, Status: {ion_status}"

    if not detected_type:
        if device_id in _candidate_anomalies:
            del _candidate_anomalies[device_id]
        if device_id in _active_anomalies:
            clear_anomaly(device_id)
        return None

    candidate = _candidate_anomalies.get(device_id)
    if not candidate or candidate.get("type") != detected_type:
        _candidate_anomalies[device_id] = {
            "type": detected_type,
            "count": 1,
            "first_seen": now
        }
        logger.info(f"[NOVA Sight] Candidate {detected_type} on {device_name} (1/2 cycle) - transient suppressed.")
        return None

    candidate["count"] += 1
    if candidate["count"] < 2:
        return None

    last_cooldown = _cooldowns.get(device_id)
    if last_cooldown and (now - last_cooldown) < timedelta(minutes=15):
        if device_id in _active_anomalies:
            _active_anomalies[device_id]["current_mbps"] = current_total_mbps
            _active_anomalies[device_id]["last_seen"] = now.isoformat()
        return None

    _cooldowns[device_id] = now

    anomaly_id = f"sight-{str(uuid.uuid4())[:8]}"
    deviation_pct = round(((current_total_mbps - mean_mbps) / max(mean_mbps, 0.1)) * 100, 1)

    anomaly_data: Dict[str, Any] = {
        "id": anomaly_id,
        "device_id": device_id,
        "device_name": device_name,
        "type": detected_type,
        "severity": severity,
        "current_mbps": current_total_mbps,
        "rx_mbps": rx_mbps,
        "tx_mbps": tx_mbps,
        "baseline_mbps": round(mean_mbps, 2),
        "deviation_percent": deviation_pct,
        "reason": reason,
        "detected_at": now.isoformat(),
        "status": "ACTIVE",
        "rca_analysis": "Sedang menganalisis akar masalah..."
    }

    _active_anomalies[device_id] = anomaly_data
    _anomaly_history.append(dict(anomaly_data))
    if len(_anomaly_history) > 50:
        _anomaly_history.pop(0)

    asyncio.create_task(_process_rca_and_notify(device_id, device_name, anomaly_data, current_metrics))

    return anomaly_data

async def _process_rca_and_notify(
    device_id: int,
    device_name: str,
    anomaly_data: Dict[str, Any],
    current_metrics: Dict[str, Any]
):
    from app.services.ai_service import analyze_traffic_anomaly

    try:
        rca_text = await analyze_traffic_anomaly(
            device_name=device_name,
            anomaly_type=anomaly_data["type"],
            severity=anomaly_data["severity"],
            current_mbps=anomaly_data["current_mbps"],
            baseline_mbps=anomaly_data["baseline_mbps"],
            deviation_percent=anomaly_data["deviation_percent"],
            interfaces=current_metrics.get("interfaces", [])
        )
    except Exception as e:
        logger.error(f"[NOVA Sight] Error running RCA: {e}")
        rca_text = (
            f"Terdeteksi anomali {anomaly_data['type']} sebesar {anomaly_data['current_mbps']} Mbps "
            f"(deviasi {anomaly_data['deviation_percent']}% dari baseline). "
            f"Periksa utilitas interface WAN dan log koneksi perangkat."
        )

    top_offenders = []
    flow_section = ""
    try:
        from app.services.flow.flow_service import get_current_spike_top_talkers
        top_offenders = get_current_spike_top_talkers(limit=5)
        if top_offenders and anomaly_data["type"] == "TRAFFIC_SPIKE":
            offenders_lines = [
                f"  {idx+1}. `{o['ip']}` ({o.get('hostname') or 'Klien'}): *{o.get('mbps', 0):.1f} Mbps* ({o.get('percent_share', 0)}%)"
                for idx, o in enumerate(top_offenders)
            ]
            flow_section = "\n\n*Top IP Terdeteksi Saat Insiden (Traffic Flow):*\n" + "\n".join(offenders_lines) + "\n_Tindakan: Silakan verifikasi via Winbox untuk manajemen queue/firewall._"
    except Exception as fe:
        logger.debug(f"[NOVA Sight] Could not fetch flow top talkers: {fe}")

    if device_id in _active_anomalies:
        _active_anomalies[device_id]["rca_analysis"] = rca_text
        _active_anomalies[device_id]["top_talkers"] = top_offenders

    ws_payload = json.dumps({
        "event": "traffic_anomaly",
        "data": {
            **anomaly_data,
            "rca_analysis": rca_text,
            "top_talkers": top_offenders
        }
    })
    await manager.broadcast(ws_payload)

    telegram_msg = (
        f"*[NOVA Sight Anomaly Alert]*\n"
        f"Perangkat: *{device_name}* (ID #{device_id})\n"
        f"Tipe: *{anomaly_data['type']}* ({anomaly_data['severity']})\n"
        f"Throughput Saat Ini: *{anomaly_data['current_mbps']} Mbps*\n"
        f"Rata-rata Baseline: *{anomaly_data['baseline_mbps']} Mbps* (Deviasi: *{anomaly_data['deviation_percent']}%*)"
        f"{flow_section}\n\n"
        f"*Analisis Akar Masalah (RCA):*\n"
        f"{rca_text}"
    )

    from app.notifications.telegram import send_telegram_remediation_alert
    try:
        await send_telegram_remediation_alert(telegram_msg, device_id=device_id)
    except Exception as tg_err:
        logger.error(f"[NOVA Sight] Failed to send Telegram alert: {tg_err}")
