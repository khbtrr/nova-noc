import asyncio
import json
import logging
import math
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from app.notifications.telegram import send_telegram_message
from app.notifications.websocket import manager

logger = logging.getLogger("nova.anomaly_service")

# Storage for active anomalies, candidates (flapping suppression), and cooldowns
_active_anomalies: Dict[int, Dict[str, Any]] = {}
_anomaly_history: List[Dict[str, Any]] = []
_candidate_anomalies: Dict[int, Dict[str, Any]] = {}
_cooldowns: Dict[int, datetime] = {}

def get_active_anomalies() -> List[Dict[str, Any]]:
    """Return all currently active traffic anomalies."""
    return list(_active_anomalies.values())

def get_anomaly_history(limit: int = 20) -> List[Dict[str, Any]]:
    """Return recent historical anomalies."""
    return _anomaly_history[-limit:]

def clear_anomaly(device_id: int):
    """Mark an active anomaly as resolved when traffic returns to normal baseline."""
    if device_id in _active_anomalies:
        resolved = _active_anomalies.pop(device_id)
        resolved["status"] = "RESOLVED"
        resolved["resolved_at"] = datetime.now(timezone.utc).isoformat()
        _anomaly_history.append(resolved)
        logger.info(f"[NOVA Sight] Traffic anomaly for device #{device_id} marked as RESOLVED.")
        # Broadcast resolution via WebSocket
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
    """
    Evaluates real-time traffic for abnormal spikes or drops using statistical baseline.
    Applies multi-layer flapping suppression (must persist >= 2 polling cycles).
    Triggers Gemini AI for Root Cause Analysis (RCA) on verified anomalies.
    """
    now = datetime.now(timezone.utc)

    # 1. Calculate current bandwidth in Mbps
    rx_kbps = float(current_metrics.get("rx_kbps", 0.0) or 0.0)
    tx_kbps = float(current_metrics.get("tx_kbps", 0.0) or 0.0)
    current_total_mbps = round((rx_kbps + tx_kbps) / 1000.0, 2)
    rx_mbps = round(rx_kbps / 1000.0, 2)
    tx_mbps = round(tx_kbps / 1000.0, 2)

    # 2. Extract baseline points from rolling history buffer (last 10-30 points)
    if not history_buffer or len(history_buffer) < 5:
        # Not enough history to establish statistical baseline
        return None

    past_points = history_buffer[-30:]
    past_rates = [
        ((float(p.get("rx_kbps", 0.0) or 0.0) + float(p.get("tx_kbps", 0.0) or 0.0)) / 1000.0)
        for p in past_points
    ]

    mean_mbps = sum(past_rates) / len(past_rates)
    variance = sum((r - mean_mbps) ** 2 for r in past_rates) / len(past_rates)
    std_dev = math.sqrt(variance)

    # 3. Statistical Detection Logic
    detected_type: Optional[str] = None
    severity: str = "WARNING"
    reason: str = ""

    # Threshold 1: Traffic Spike
    # Criteria: value exceeds mean by > 2.2x AND absolute jump is >= 5.0 Mbps (or z_score >= 2.5)
    z_score = (current_total_mbps - mean_mbps) / max(std_dev, 0.5)
    if (current_total_mbps >= mean_mbps * 2.2 and (current_total_mbps - mean_mbps) >= 5.0) or z_score >= 2.8:
        detected_type = "TRAFFIC_SPIKE"
        severity = "CRITICAL" if (current_total_mbps >= mean_mbps * 3.5 or z_score >= 4.0) else "WARNING"
        reason = f"Lonjakan trafik mendadak {current_total_mbps:.1f} Mbps (Rata-rata: {mean_mbps:.1f} Mbps, Z-Score: {z_score:.1f})"

    # Threshold 2: Traffic Drop / Blackout
    # Criteria: baseline was substantial (> 10 Mbps) and current throughput dropped by > 80%
    elif mean_mbps >= 10.0 and current_total_mbps <= (mean_mbps * 0.2):
        detected_type = "TRAFFIC_DROP"
        severity = "CRITICAL"
        reason = f"Penurunan trafik drastis tak wajar ke {current_total_mbps:.1f} Mbps (Rata-rata: {mean_mbps:.1f} Mbps, Drop: >80%)"

    # Threshold 3: Dual-WAN Link Degradation / Failover
    else:
        jlm_loss = float(current_metrics.get("jlm_packet_loss", 0.0) or 0.0)
        jlm_status = str(current_metrics.get("jlm_status", "UP")).upper()
        ion_loss = float(current_metrics.get("ion_packet_loss", 0.0) or 0.0)
        ion_status = str(current_metrics.get("ion_status", "UP")).upper()

        if jlm_loss >= 25.0 or jlm_status == "DOWN":
            detected_type = "WAN_DEGRADATION_JLM"
            severity = "CRITICAL"
            reason = f"Uplink Provider JLM (sfplus1-JLM) mengalami gangguan: Packet loss {jlm_loss:.0f}%, Status: {jlm_status}"
        elif ion_loss >= 25.0 or ion_status == "DOWN":
            detected_type = "WAN_DEGRADATION_ION"
            severity = "CRITICAL"
            reason = f"Uplink Provider ION (ge1-ION) mengalami gangguan: Packet loss {ion_loss:.0f}%, Status: {ion_status}"

    # If traffic is currently normal
    if not detected_type:
        # Clear transient candidate
        if device_id in _candidate_anomalies:
            del _candidate_anomalies[device_id]
        # Resolve active anomaly if any
        if device_id in _active_anomalies:
            clear_anomaly(device_id)
        return None

    # 4. Flapping & Persistence Filter (Must persist >= 2 consecutive polling cycles)
    candidate = _candidate_anomalies.get(device_id)
    if not candidate or candidate.get("type") != detected_type:
        _candidate_anomalies[device_id] = {
            "type": detected_type,
            "count": 1,
            "first_seen": now
        }
        logger.info(f"[NOVA Sight] Candidate {detected_type} on {device_name} (1/2 cycle) - transient suppressed.")
        return None

    # Candidate persisted! Increment cycle count
    candidate["count"] += 1
    if candidate["count"] < 2:
        return None

    # 5. Cooldown check (15 minutes per device to eliminate alert noise)
    last_cooldown = _cooldowns.get(device_id)
    if last_cooldown and (now - last_cooldown) < timedelta(minutes=15):
        # Update current values in active anomaly if already tracked
        if device_id in _active_anomalies:
            _active_anomalies[device_id]["current_mbps"] = current_total_mbps
            _active_anomalies[device_id]["last_seen"] = now.isoformat()
        return None

    _cooldowns[device_id] = now

    # 6. Build Verified Anomaly Payload
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
        "rca_analysis": "Sedang menganalisis akar masalah dengan Gemini AI..."
    }

    _active_anomalies[device_id] = anomaly_data
    _anomaly_history.append(dict(anomaly_data))
    if len(_anomaly_history) > 50:
        _anomaly_history.pop(0)

    # 7. Asynchronous RCA Execution & Notification Dispatch
    asyncio.create_task(_process_rca_and_notify(device_id, device_name, anomaly_data, current_metrics))

    return anomaly_data

async def _process_rca_and_notify(
    device_id: int,
    device_name: str,
    anomaly_data: Dict[str, Any],
    current_metrics: Dict[str, Any]
):
    """Generates Gemini RCA and dispatches rich Telegram alert and WebSocket broadcast."""
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
        logger.error(f"[NOVA Sight] Error running Gemini RCA: {e}")
        rca_text = (
            f"Terdeteksi anomali {anomaly_data['type']} sebesar {anomaly_data['current_mbps']} Mbps "
            f"(deviasi {anomaly_data['deviation_percent']}% dari baseline). "
            f"Periksa utilitas interface WAN dan log koneksi perangkat."
        )

    # Update in memory
    if device_id in _active_anomalies:
        _active_anomalies[device_id]["rca_analysis"] = rca_text

    # 1. Broadcast via WebSocket
    ws_payload = json.dumps({
        "event": "traffic_anomaly",
        "data": {
            **anomaly_data,
            "rca_analysis": rca_text
        }
    })
    await manager.broadcast(ws_payload)

    # 2. Dispatch Telegram Notification
    telegram_msg = (
        f"🚨 *[NOVA Sight Anomaly Alert]*\n"
        f"Perangkat: *{device_name}* (ID #{device_id})\n"
        f"Tipe: *{anomaly_data['type']}* ({anomaly_data['severity']})\n"
        f"Throughput Saat Ini: *{anomaly_data['current_mbps']} Mbps*\n"
        f"Rata-rata Baseline: *{anomaly_data['baseline_mbps']} Mbps* (Deviasi: *{anomaly_data['deviation_percent']}%*)\n\n"
        f"🧠 *Analisis Akar Masalah (Gemini AI RCA):*\n"
        f"{rca_text}"
    )

    from app.notifications.telegram import send_telegram_remediation_alert
    try:
        await send_telegram_remediation_alert(telegram_msg, device_id=device_id)
    except Exception as tg_err:
        logger.error(f"[NOVA Sight] Failed to send Telegram alert: {tg_err}")
