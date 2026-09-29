import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from app.influxdb import influx_db

# In-memory storage of latest device state snapshots
_latest_snapshots: Dict[int, Dict[str, Any]] = {}
_history_buffer: Dict[int, List[Dict[str, Any]]] = {}

def update_device_snapshot(device_id: int, data: Dict[str, Any]):
    _latest_snapshots[device_id] = {
        **data,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Keep rolling 60 points of history in-memory for instant chart rendering
    if device_id not in _history_buffer:
        _history_buffer[device_id] = []
    
    point = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cpu": float(data.get("cpu_load", 0.0) or 0.0),
        "memory": float(data.get("memory_usage", 0.0) or 0.0),
        "rx_kbps": float(data.get("rx_kbps", 0.0) or 0.0),
        "tx_kbps": float(data.get("tx_kbps", 0.0) or 0.0),
        "latency_ms": float(data.get("latency_ms", 0.0) or 0.0),
        "packet_loss": float(data.get("packet_loss", 0.0) or 0.0),
        "wan_latency_ms": float(data.get("wan_latency_ms", 0.0) or 0.0),
        "wan_packet_loss": float(data.get("wan_packet_loss", 0.0) or 0.0),
        "jlm_latency_ms": float(data.get("jlm_latency_ms", 0.0) or 0.0),
        "jlm_packet_loss": float(data.get("jlm_packet_loss", 0.0) or 0.0),
        "jlm_rx_mbps": float(data.get("jlm_rx_mbps", 0.0) or 0.0),
        "jlm_tx_mbps": float(data.get("jlm_tx_mbps", 0.0) or 0.0),
        "ion_latency_ms": float(data.get("ion_latency_ms", 0.0) or 0.0),
        "ion_packet_loss": float(data.get("ion_packet_loss", 0.0) or 0.0),
        "ion_rx_mbps": float(data.get("ion_rx_mbps", 0.0) or 0.0),
        "ion_tx_mbps": float(data.get("ion_tx_mbps", 0.0) or 0.0),
    }
    _history_buffer[device_id].append(point)
    if len(_history_buffer[device_id]) > 60:
        _history_buffer[device_id].pop(0)

def get_current_metrics(device_id: int) -> Optional[Dict[str, Any]]:
    # Check in-memory snapshot first
    if device_id in _latest_snapshots:
        return _latest_snapshots[device_id]
        
    # Try querying InfluxDB
    try:
        tables = influx_db.query_metrics(str(device_id), time_range="-5m")
        if tables:
            metrics: Dict[str, Any] = {"device_id": device_id}
            for table in tables:
                for record in table.records:
                    metrics[record.get_field()] = record.get_value()
            return metrics
    except Exception:
        pass

    # No metrics available yet
    return None

def get_metrics_history(device_id: int, range_str: str = "1h") -> Dict[str, Any]:
    # 1. Query InfluxDB first for long-term telemetry
    try:
        influx_data = influx_db.query_metrics_history(str(device_id), range_str)
        if influx_data and len(influx_data.get("timestamps", [])) > 0:
            return influx_data
    except Exception:
        # InfluxDB query failed or unreachable, fall back gracefully to buffer
        pass

    # 2. Fall back to in-memory rolling buffer for recently added devices
    buffer = _history_buffer.get(device_id, [])
    if buffer:
        timestamps = [p["timestamp"] for p in buffer]
        cpu = [p["cpu"] for p in buffer]
        memory = [p["memory"] for p in buffer]
        rx = [p.get("rx_kbps", 0.0) for p in buffer]
        tx = [p.get("tx_kbps", 0.0) for p in buffer]
        latency = [p.get("latency_ms", 0.0) for p in buffer]
        packet_loss = [p.get("packet_loss", 0.0) for p in buffer]
        wan_latency = [p.get("wan_latency_ms", 0.0) for p in buffer]
        wan_packet_loss = [p.get("wan_packet_loss", 0.0) for p in buffer]
        jlm_latency = [p.get("jlm_latency_ms", 0.0) for p in buffer]
        jlm_packet_loss = [p.get("jlm_packet_loss", 0.0) for p in buffer]
        ion_latency = [p.get("ion_latency_ms", 0.0) for p in buffer]
        ion_packet_loss = [p.get("ion_packet_loss", 0.0) for p in buffer]
        return {
            "device_id": device_id,
            "timestamps": timestamps,
            "cpu": cpu,
            "memory": memory,
            "rx": rx,
            "tx": tx,
            "latency": latency,
            "packet_loss": packet_loss,
            "wan_latency": wan_latency,
            "wan_packet_loss": wan_packet_loss,
            "jlm_latency": jlm_latency,
            "jlm_packet_loss": jlm_packet_loss,
            "ion_latency": ion_latency,
            "ion_packet_loss": ion_packet_loss
        }

    return {
        "device_id": device_id,
        "timestamps": [],
        "cpu": [],
        "memory": [],
        "rx": [],
        "tx": [],
        "latency": [],
        "packet_loss": [],
        "wan_latency": [],
        "wan_packet_loss": [],
        "jlm_latency": [],
        "jlm_packet_loss": [],
        "ion_latency": [],
        "ion_packet_loss": []
    }

def get_device_interfaces(device_id: int) -> List[Dict[str, Any]]:
    snapshot = _latest_snapshots.get(device_id)
    if snapshot and "interfaces" in snapshot:
        return snapshot["interfaces"]
    return []

def get_device_dhcp_leases(device_id: int) -> List[Dict[str, Any]]:
    snapshot = _latest_snapshots.get(device_id)
    if snapshot and "dhcp_leases" in snapshot:
        return snapshot["dhcp_leases"]
    return []

def get_device_routes(device_id: int) -> List[Dict[str, Any]]:
    snapshot = _latest_snapshots.get(device_id)
    if snapshot and "routes" in snapshot:
        return snapshot["routes"]
    return []

