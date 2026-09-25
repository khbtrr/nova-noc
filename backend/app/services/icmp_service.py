import asyncio
import logging
import re
from typing import Dict, Any, Optional

logger = logging.getLogger("nova.pulse.icmp")

def parse_routeros_duration(time_str: str) -> float:
    """
    Parse RouterOS time format like '13ms612us' or '45ms' or '1s200ms' into milliseconds (float).
    """
    if not time_str or time_str == "timeout":
        return 0.0
    
    total_ms = 0.0
    
    # Seconds
    s_match = re.search(r'(\d+)s', time_str)
    if s_match:
        total_ms += float(s_match.group(1)) * 1000.0
        
    # Milliseconds
    ms_match = re.search(r'(\d+)ms', time_str)
    if ms_match:
        total_ms += float(ms_match.group(1))
        
    # Microseconds
    us_match = re.search(r'(\d+)us', time_str)
    if us_match:
        total_ms += float(us_match.group(1)) / 1000.0
        
    return round(total_ms, 2)

async def ping_host(host: str, count: int = 4, timeout: float = 1.0) -> Dict[str, Any]:
    """
    Execute asynchronous ICMP ping from the NOVA server to the target host.
    Returns: {
        'latency_ms': float,
        'packet_loss': float,
        'min_rtt': float,
        'max_rtt': float,
        'success': bool
    }
    """
    result = {
        "latency_ms": 0.0,
        "packet_loss": 100.0,
        "min_rtt": 0.0,
        "max_rtt": 0.0,
        "success": False
    }

    if not host or host == "N/A" or host == "127.0.0.1":
        return result

    try:
        # Run system ping: -c count, -W timeout_in_seconds
        proc = await asyncio.create_subprocess_exec(
            "ping",
            "-c", str(count),
            "-W", str(max(int(timeout), 1)),
            host,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=(count * timeout + 2.0))
        except asyncio.TimeoutError:
            proc.kill()
            logger.debug(f"Ping timeout for {host}")
            return result

        output = stdout.decode("utf-8", errors="ignore")

        # Extract packet loss: 'X% packet loss'
        loss_match = re.search(r'(\d+(?:\.\d+)?)%\s+packet\s+loss', output)
        if loss_match:
            result["packet_loss"] = float(loss_match.group(1))

        # Extract RTT stats: 'rtt min/avg/max/mdev = min/avg/max/mdev ms'
        rtt_match = re.search(r'(?:rtt|round-trip)\s+min/avg/max/(?:mdev|stddev)\s*=\s*([0-9.]+)/([0-9.]+)/([0-9.]+)/([0-9.]+)\s*ms', output)
        if rtt_match:
            result["min_rtt"] = float(rtt_match.group(1))
            result["latency_ms"] = float(rtt_match.group(2))
            result["max_rtt"] = float(rtt_match.group(3))
            result["success"] = True
        elif result["packet_loss"] < 100.0:
            result["success"] = True

    except Exception as e:
        logger.debug(f"Error executing ping to {host}: {e}")

    return result

def parse_mikrotik_ping_results(raw_records: list) -> Dict[str, Any]:
    """
    Parse RouterOS API /tool/ping result records into RTT and Packet Loss.
    """
    result = {
        "wan_latency_ms": 0.0,
        "wan_packet_loss": 0.0,
        "wan_min_rtt": 0.0,
        "wan_max_rtt": 0.0,
        "success": False
    }

    if not raw_records:
        result["wan_packet_loss"] = 100.0
        return result

    # The last record usually contains cumulative stats
    last = raw_records[-1]
    
    loss_val = last.get("packet-loss")
    if loss_val is not None:
        try:
            result["wan_packet_loss"] = float(loss_val)
        except (ValueError, TypeError):
            result["wan_packet_loss"] = 0.0

    avg_str = last.get("avg-rtt") or last.get("time") or ""
    min_str = last.get("min-rtt") or ""
    max_str = last.get("max-rtt") or ""

    result["wan_latency_ms"] = parse_routeros_duration(str(avg_str))
    result["wan_min_rtt"] = parse_routeros_duration(str(min_str))
    result["wan_max_rtt"] = parse_routeros_duration(str(max_str))
    result["success"] = result["wan_packet_loss"] < 100.0

    return result
