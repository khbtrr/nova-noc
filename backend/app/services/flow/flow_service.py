import asyncio
import json
import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from collections import defaultdict

from app.config import settings
from app.services.flow.netflow_decoder import decode_flow_packet, get_service_name
from app.services.metrics_service import _latest_snapshots
from app.notifications.websocket import manager

logger = logging.getLogger("nova.flow.service")

# Global Flow Service State
_flow_transport: Optional[asyncio.DatagramTransport] = None
_is_running: bool = False
_start_time: Optional[datetime] = None

# Metrics & Counter Stats
_stats = {
    "total_packets_received": 0,
    "total_flows_processed": 0,
    "total_bytes_processed": 0,
    "packets_last_minute": 0,
    "last_received_at": None,
}

# Live Rolling Data (last 15 minutes, minute-by-minute buckets)
# bucket_timestamp (epoch minute) -> { 'src_ips': {ip: bytes}, 'dst_ips': {ip: bytes}, 'protocols': {proto: bytes}, 'conversations': {...} }
_minute_buckets: Dict[int, Dict[str, Any]] = defaultdict(lambda: {
    "src_ips": defaultdict(int),
    "src_pkts": defaultdict(int),
    "dst_ips": defaultdict(int),
    "protocols": defaultdict(int),
    "ports": defaultdict(int),
    "conversations": defaultdict(int),
    "total_bytes": 0,
    "total_pkts": 0,
})

def _get_current_minute_epoch() -> int:
    """Return epoch seconds rounded to current minute."""
    return int(time.time() // 60) * 60

def _resolve_ip_hostname(ip: str) -> Optional[str]:
    """Resolves a local IP address to computer hostname using active DHCP leases from Core Router snapshot."""
    for dev_id, snap in _latest_snapshots.items():
        leases = snap.get("dhcp_leases", [])
        for lease in leases:
            if lease.get("address") == ip:
                name = lease.get("host_name") or lease.get("comment")
                if name and name != "Klien":
                    return name
    return None

class NetFlowReceiverProtocol(asyncio.DatagramProtocol):
    def connection_made(self, transport: asyncio.DatagramTransport):
        global _flow_transport, _is_running
        _flow_transport = transport
        _is_running = True
        logger.info(f"NetFlow UDP receiver listening on 0.0.0.0:{settings.NETFLOW_UDP_PORT}")

    def datagram_received(self, data: bytes, addr: Tuple[str, int]):
        global _stats
        _stats["total_packets_received"] += 1
        _stats["packets_last_minute"] += 1
        _stats["last_received_at"] = datetime.now(timezone.utc).isoformat()

        decoded = decode_flow_packet(data)
        if not decoded or not decoded.get("records"):
            return

        records = decoded["records"]
        _stats["total_flows_processed"] += len(records)

        current_min = _get_current_minute_epoch()
        bucket = _minute_buckets[current_min]

        for r in records:
            b_count = r["bytes"]
            p_count = r["packets"]
            src_ip = r["src_ip"]
            dst_ip = r["dst_ip"]
            proto = r["protocol"]
            dst_port = r["dst_port"]

            _stats["total_bytes_processed"] += b_count
            bucket["total_bytes"] += b_count
            bucket["total_pkts"] += p_count

            bucket["src_ips"][src_ip] += b_count
            bucket["src_pkts"][src_ip] += p_count
            bucket["dst_ips"][dst_ip] += b_count
            bucket["protocols"][proto] += b_count
            bucket["ports"][dst_port] += b_count

            conv_key = f"{src_ip}->{dst_ip}:{dst_port}/{proto}"
            bucket["conversations"][conv_key] += b_count

    def error_received(self, exc: Exception):
        logger.warning(f"NetFlow receiver error: {exc}")

    def connection_lost(self, exc: Optional[Exception]):
        global _is_running
        _is_running = False
        logger.info("NetFlow receiver stopped.")


def _clean_old_buckets():
    """Retains only the last 30 minutes of rolling minute buckets in memory."""
    now_epoch = _get_current_minute_epoch()
    cutoff = now_epoch - (30 * 60)
    old_keys = [k for k in _minute_buckets.keys() if k < cutoff]
    for k in old_keys:
        del _minute_buckets[k]


async def _background_flush_task():
    """Background task running every 60 seconds: writes 1-minute Top Talkers to InfluxDB."""
    from app.influxdb import influx_db

    while True:
        try:
            await asyncio.sleep(60)
            _clean_old_buckets()

            # Previous completed minute
            prev_min = _get_current_minute_epoch() - 60
            if prev_min in _minute_buckets:
                bucket = _minute_buckets[prev_min]
                total_bytes = bucket["total_bytes"]
                mbps = round((total_bytes * 8) / (60.0 * 1000000.0), 2)

                # Write top 5 talkers to InfluxDB
                sorted_src = sorted(bucket["src_ips"].items(), key=lambda x: x[1], reverse=True)[:5]
                for ip, b in sorted_src:
                    ip_mbps = round((b * 8) / (60.0 * 1000000.0), 2)
                    try:
                        influx_db.write_metrics("flow-engine", "Core Flow Engine", ip, {
                            "bandwidth_mbps": ip_mbps,
                            "bytes": float(b),
                            "packets": float(bucket["src_pkts"].get(ip, 0)),
                        })
                    except Exception:
                        pass

                # Broadcast live flow snapshot via WebSocket
                top_5 = get_top_talkers(window="5m", limit=5)
                await manager.broadcast(json.dumps({
                    "event": "flow_update",
                    "data": {
                        "total_mbps": mbps,
                        "top_talkers": top_5,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                }))

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.debug(f"Error in flow background flush: {e}")


_flush_task: Optional[asyncio.Task] = None

async def start_flow_receiver():
    """Starts the NetFlow UDP listener and background aggregator."""
    global _flush_task, _start_time
    if not settings.NETFLOW_ENABLED:
        logger.info("NetFlow receiver is disabled in settings.")
        return

    port = settings.NETFLOW_UDP_PORT
    loop = asyncio.get_running_loop()
    try:
        await loop.create_datagram_endpoint(
            lambda: NetFlowReceiverProtocol(),
            local_addr=("0.0.0.0", port)
        )
        _start_time = datetime.now(timezone.utc)
        _flush_task = asyncio.create_task(_background_flush_task())
        logger.info(f"NetFlow receiver active on UDP port {port}")
    except Exception as e:
        logger.error(f"Failed to start NetFlow receiver on port {port}: {e}")

def stop_flow_receiver():
    """Stops the NetFlow UDP listener."""
    global _flow_transport, _flush_task
    if _flow_transport:
        _flow_transport.close()
    if _flush_task and not _flush_task.done():
        _flush_task.cancel()
    logger.info("NetFlow receiver stopped.")


# Query Services for UI & Anomaly Correlation

def _get_window_buckets(window: str) -> List[Dict[str, Any]]:
    """Returns minute buckets matching the requested time window."""
    minutes_count = 5
    if window == "1m":
        minutes_count = 1
    elif window == "5m":
        minutes_count = 5
    elif window == "15m":
        minutes_count = 15
    elif window == "30m":
        minutes_count = 30
    elif window == "1h":
        minutes_count = 60

    now_epoch = _get_current_minute_epoch()
    start_epoch = now_epoch - (minutes_count * 60)
    return [b for k, b in _minute_buckets.items() if k >= start_epoch]


def get_top_talkers(window: str = "5m", limit: int = 20) -> List[Dict[str, Any]]:
    """
    Returns aggregated Top Source IPs (upload/originators) in the time window.
    """
    buckets = _get_window_buckets(window)
    if not buckets:
        return []

    combined_ips: Dict[str, int] = defaultdict(int)
    combined_pkts: Dict[str, int] = defaultdict(int)
    total_window_bytes = 0

    for b in buckets:
        total_window_bytes += b["total_bytes"]
        for ip, count in b["src_ips"].items():
            combined_ips[ip] += count
        for ip, p in b["src_pkts"].items():
            combined_pkts[ip] += p

    if total_window_bytes == 0:
        return []

    # Window duration in seconds
    mins = max(len(buckets), 1)
    duration_secs = mins * 60.0

    sorted_ips = sorted(combined_ips.items(), key=lambda x: x[1], reverse=True)[:limit]
    result = []

    for rank, (ip, b_count) in enumerate(sorted_ips, 1):
        mbps = round((b_count * 8.0) / (duration_secs * 1000000.0), 2)
        pct = round((b_count / total_window_bytes) * 100.0, 1)
        hostname = _resolve_ip_hostname(ip)

        result.append({
            "rank": rank,
            "ip": ip,
            "hostname": hostname or "(Perangkat Klien)",
            "bytes": b_count,
            "mbps": mbps,
            "packets": combined_pkts.get(ip, 0),
            "percent_share": pct,
            "is_local": ip.startswith("172.16.") or ip.startswith("192.168.") or ip.startswith("10."),
        })

    return result


def get_top_destinations(window: str = "5m", limit: int = 20) -> List[Dict[str, Any]]:
    """
    Returns aggregated Top Destination IPs in the time window.
    """
    buckets = _get_window_buckets(window)
    if not buckets:
        return []

    combined_dst: Dict[str, int] = defaultdict(int)
    total_window_bytes = 0

    for b in buckets:
        total_window_bytes += b["total_bytes"]
        for ip, count in b["dst_ips"].items():
            combined_dst[ip] += count

    if total_window_bytes == 0:
        return []

    mins = max(len(buckets), 1)
    duration_secs = mins * 60.0
    sorted_dst = sorted(combined_dst.items(), key=lambda x: x[1], reverse=True)[:limit]
    result = []

    for rank, (ip, b_count) in enumerate(sorted_dst, 1):
        mbps = round((b_count * 8.0) / (duration_secs * 1000000.0), 2)
        pct = round((b_count / total_window_bytes) * 100.0, 1)

        result.append({
            "rank": rank,
            "ip": ip,
            "hostname": _resolve_ip_hostname(ip) or "(Remote / Internet Server)",
            "bytes": b_count,
            "mbps": mbps,
            "percent_share": pct,
            "is_local": ip.startswith("172.16.") or ip.startswith("192.168.") or ip.startswith("10."),
        })

    return result


def get_protocols(window: str = "5m") -> List[Dict[str, Any]]:
    """
    Returns breakdown of bandwidth utilization per protocol/service.
    """
    buckets = _get_window_buckets(window)
    if not buckets:
        return []

    combined_proto: Dict[str, int] = defaultdict(int)
    combined_ports: Dict[int, int] = defaultdict(int)
    total_bytes = 0

    for b in buckets:
        total_bytes += b["total_bytes"]
        for p, count in b["protocols"].items():
            combined_proto[p] += count
        for port, count in b["ports"].items():
            combined_ports[port] += count

    if total_bytes == 0:
        return []

    # Map top application ports
    result = []
    # 1. By Protocol (TCP, UDP, ICMP)
    for proto, b_count in sorted(combined_proto.items(), key=lambda x: x[1], reverse=True):
        pct = round((b_count / total_bytes) * 100.0, 1)
        result.append({
            "name": proto,
            "type": "protocol",
            "bytes": b_count,
            "percent": pct
        })

    # 2. By Top Ports (HTTPS, HTTP, DNS, Winbox, etc.)
    for port, b_count in sorted(combined_ports.items(), key=lambda x: x[1], reverse=True)[:8]:
        service_name = get_service_name(port)
        pct = round((b_count / total_bytes) * 100.0, 1)
        result.append({
            "name": f"{service_name} (Port {port})",
            "type": "service",
            "bytes": b_count,
            "percent": pct
        })

    return result


def get_conversations(window: str = "5m", limit: int = 20) -> List[Dict[str, Any]]:
    """
    Returns Top Communications (Source IP -> Destination IP:Port).
    """
    buckets = _get_window_buckets(window)
    if not buckets:
        return []

    combined_conv: Dict[str, int] = defaultdict(int)
    total_bytes = 0

    for b in buckets:
        total_bytes += b["total_bytes"]
        for k, count in b["conversations"].items():
            combined_conv[k] += count

    if total_bytes == 0:
        return []

    mins = max(len(buckets), 1)
    duration_secs = mins * 60.0

    sorted_conv = sorted(combined_conv.items(), key=lambda x: x[1], reverse=True)[:limit]
    result = []

    for rank, (conv_key, b_count) in enumerate(sorted_conv, 1):
        mbps = round((b_count * 8.0) / (duration_secs * 1000000.0), 2)
        pct = round((b_count / total_bytes) * 100.0, 1)
        
        # parse key: "src->dst:port/proto"
        try:
            parts = conv_key.split("->")
            src = parts[0]
            dst_part = parts[1]
            dst_ip, rest = dst_part.split(":")
            port_str, proto = rest.split("/")
            port_num = int(port_str)
            service = get_service_name(port_num, proto)
        except Exception:
            src = "N/A"
            dst_ip = "N/A"
            service = "Unknown"
            proto = "IP"

        result.append({
            "rank": rank,
            "src_ip": src,
            "src_hostname": _resolve_ip_hostname(src) or "-",
            "dst_ip": dst_ip,
            "dst_hostname": _resolve_ip_hostname(dst_ip) or "-",
            "service": service,
            "protocol": proto,
            "bytes": b_count,
            "mbps": mbps,
            "percent": pct
        })

    return result


def get_flow_status() -> Dict[str, Any]:
    """Returns NetFlow listener status and processing metrics."""
    global _stats, _is_running, _start_time

    now = datetime.now(timezone.utc)
    uptime_sec = round((now - _start_time).total_seconds()) if _start_time else 0

    # Calculate current live Mbps across last minute
    curr_min = _get_current_minute_epoch()
    last_min_bucket = _minute_buckets.get(curr_min - 60) or _minute_buckets.get(curr_min)
    live_bytes = last_min_bucket["total_bytes"] if last_min_bucket else 0
    live_mbps = round((live_bytes * 8.0) / (60.0 * 1000000.0), 2)

    return {
        "is_running": _is_running,
        "port": settings.NETFLOW_UDP_PORT,
        "enabled": settings.NETFLOW_ENABLED,
        "uptime_seconds": uptime_sec,
        "total_packets_received": _stats["total_packets_received"],
        "total_flows_processed": _stats["total_flows_processed"],
        "total_bytes_processed": _stats["total_bytes_processed"],
        "live_throughput_mbps": live_mbps,
        "last_received_at": _stats["last_received_at"],
        "configured_exporter": "MikroTik Core Router (119.18.156.155 / Target 2055/udp)"
    }


def get_current_spike_top_talkers(limit: int = 5) -> List[Dict[str, Any]]:
    """
    Extracts Top Talkers at the exact current minute for NOVA Sight anomaly alert enrichment.
    """
    return get_top_talkers(window="5m", limit=limit)
