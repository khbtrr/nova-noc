import asyncio
import logging
import time
from typing import Dict, Any, Tuple
from app.collectors.base import BaseCollector
from app.models.device import Device
from app.influxdb import influx_db
from app.services.metrics_service import update_device_snapshot
from app.services.icmp_service import ping_host

logger = logging.getLogger("nova.collector.snmp")

# Track previous traffic counters for bandwidth calculation: device_id -> (timestamp, rx_bytes, tx_bytes)
_snmp_traffic_history: Dict[int, Tuple[float, int, int]] = {}

class SNMPCollector(BaseCollector):
    async def collect(self, device: Device) -> dict:
        """Collect metrics from SNMP-enabled network device (Switches/Routers)."""
        # 1. Measure Server-to-Device ICMP ping (latency & packet loss)
        icmp_stat = await ping_host(device.host, count=4, timeout=1.0)
        latency_ms = icmp_stat.get("latency_ms", 0.0)
        packet_loss = icmp_stat.get("packet_loss", 0.0)
        min_rtt = icmp_stat.get("min_rtt", 0.0)
        max_rtt = icmp_stat.get("max_rtt", 0.0)

        from app.core.crypto import decrypt_credential
        community_str = decrypt_credential(device.snmp_community) or 'public'
        port_num = device.port or 161
        host_str = device.host

        try:
            from pysnmp.hlapi.asyncio import (
                get_cmd, walk_cmd, SnmpEngine, CommunityData, UdpTransportTarget,
                ContextData, ObjectType, ObjectIdentity
            )

            engine = SnmpEngine()
            # mpModel: 0 = v1, 1 = v2c
            mp_model = 0 if (device.snmp_version and '1' in device.snmp_version) else 1
            community = CommunityData(community_str, mpModel=mp_model)
            target = await UdpTransportTarget.create((host_str, port_num), timeout=3.0, retries=1)

            # 2. Query System Info, CPU, and Memory via standard MIBs
            # hrProcessorLoad: 1.3.6.1.2.1.25.3.3.1.2.1
            # sysDescr: 1.3.6.1.2.1.1.1.0
            # sysUpTime: 1.3.6.1.2.1.1.3.0
            # sysName: 1.3.6.1.2.1.1.5.0
            # hrStorage main memory: 65536
            err_ind, err_stat, err_idx, var_binds = await get_cmd(
                engine, community, target, ContextData(),
                ObjectType(ObjectIdentity('1.3.6.1.2.1.1.1.0')),             # sysDescr
                ObjectType(ObjectIdentity('1.3.6.1.2.1.1.3.0')),             # sysUpTime
                ObjectType(ObjectIdentity('1.3.6.1.2.1.1.5.0')),             # sysName
                ObjectType(ObjectIdentity('1.3.6.1.2.1.25.3.3.1.2.1')),      # hrProcessorLoad.1
                ObjectType(ObjectIdentity('1.3.6.1.2.1.25.2.3.1.4.65536')),  # hrStorageAllocationUnits
                ObjectType(ObjectIdentity('1.3.6.1.2.1.25.2.3.1.5.65536')),  # hrStorageSize
                ObjectType(ObjectIdentity('1.3.6.1.2.1.25.2.3.1.6.65536')),  # hrStorageUsed
            )

            if err_ind or err_stat:
                logger.warning(f"SNMP get_cmd error for {host_str}: {err_ind or err_stat}")
                if icmp_stat.get("success"):
                    # Fallback to ICMP-active metrics
                    m = {
                        "device_id": device.id,
                        "cpu_load": 0.0,
                        "memory_usage": 0.0,
                        "latency_ms": latency_ms,
                        "packet_loss": packet_loss,
                        "min_rtt": min_rtt,
                        "max_rtt": max_rtt,
                        "uptime": "ICMP Active (SNMP Timeout)",
                        "board_name": device.name,
                        "version": "SNMP Unresponsive",
                        "rx_kbps": 0.0,
                        "tx_kbps": 0.0,
                        "interfaces": []
                    }
                    update_device_snapshot(device.id, m)
                    return m
                return None

            data_map = {str(vb[0]): vb[1].prettyPrint() for vb in var_binds}

            # Parse description & name
            sys_descr = data_map.get('1.3.6.1.2.1.1.1.0') or "SNMP Switch"
            sys_name = data_map.get('1.3.6.1.2.1.1.5.0') or device.name

            # Parse uptime
            raw_ticks = 0
            try:
                raw_ticks = int(data_map.get('1.3.6.1.2.1.1.3.0', '0') or 0) // 100
            except (ValueError, TypeError):
                pass
            days = raw_ticks // 86400
            hours = (raw_ticks % 86400) // 3600
            mins = (raw_ticks % 3600) // 60
            uptime_str = f"{days}d {hours}h {mins}m" if days > 0 else f"{hours}h {mins}m"

            # Parse CPU Load
            cpu_load = 0.0
            try:
                cpu_load = float(data_map.get('1.3.6.1.2.1.25.3.3.1.2.1', '0') or 0.0)
            except (ValueError, TypeError):
                pass

            # Parse Memory Usage
            mem_usage = 0.0
            total_mem = 0
            used_mem = 0
            free_mem = 0
            try:
                units = int(data_map.get('1.3.6.1.2.1.25.2.3.1.4.65536', '1024') or 1024)
                size_blocks = int(data_map.get('1.3.6.1.2.1.25.2.3.1.5.65536', '0') or 0)
                used_blocks = int(data_map.get('1.3.6.1.2.1.25.2.3.1.6.65536', '0') or 0)
                total_mem = size_blocks * units
                used_mem = used_blocks * units
                free_mem = max(0, total_mem - used_mem)
                if total_mem > 0:
                    mem_usage = round((used_mem / total_mem) * 100.0, 2)
            except (ValueError, TypeError):
                pass

            # 3. Query Interfaces via SNMP Walk
            interfaces_map = {}
            total_rx_bytes = 0
            total_tx_bytes = 0

            # 3a. ifDescr (1.3.6.1.2.1.2.2.1.2)
            try:
                async for _, _, _, var_binds_if in walk_cmd(
                    engine, community, target, ContextData(),
                    ObjectType(ObjectIdentity('1.3.6.1.2.1.2.2.1.2')),
                    lexicographicMode=False
                ):
                    for vb in var_binds_if:
                        idx = str(vb[0]).split('.')[-1]
                        interfaces_map[idx] = {
                            "name": vb[1].prettyPrint(),
                            "type": "ethernet",
                            "rx_bytes": 0,
                            "tx_bytes": 0,
                            "running": True,
                            "disabled": False
                        }
            except Exception as walk_err:
                logger.debug(f"ifDescr walk skipped for {host_str}: {walk_err}")

            # 3b. ifOperStatus (1.3.6.1.2.1.2.2.1.8)
            try:
                async for _, _, _, var_binds_status in walk_cmd(
                    engine, community, target, ContextData(),
                    ObjectType(ObjectIdentity('1.3.6.1.2.1.2.2.1.8')),
                    lexicographicMode=False
                ):
                    for vb in var_binds_status:
                        idx = str(vb[0]).split('.')[-1]
                        if idx in interfaces_map:
                            is_up = (str(vb[1].prettyPrint()) == '1')
                            interfaces_map[idx]["running"] = is_up
                            interfaces_map[idx]["disabled"] = not is_up
            except Exception:
                pass

            # 3c. 64-bit HC Octets (ifHCInOctets & ifHCOutOctets)
            try:
                async for _, _, _, var_binds_in in walk_cmd(
                    engine, community, target, ContextData(),
                    ObjectType(ObjectIdentity('1.3.6.1.2.1.31.1.1.1.6')),
                    lexicographicMode=False
                ):
                    for vb in var_binds_in:
                        idx = str(vb[0]).split('.')[-1]
                        if idx in interfaces_map:
                            rx = int(vb[1].prettyPrint() or 0)
                            interfaces_map[idx]["rx_bytes"] = rx
                            total_rx_bytes += rx

                async for _, _, _, var_binds_out in walk_cmd(
                    engine, community, target, ContextData(),
                    ObjectType(ObjectIdentity('1.3.6.1.2.1.31.1.1.1.10')),
                    lexicographicMode=False
                ):
                    for vb in var_binds_out:
                        idx = str(vb[0]).split('.')[-1]
                        if idx in interfaces_map:
                            tx = int(vb[1].prettyPrint() or 0)
                            interfaces_map[idx]["tx_bytes"] = tx
                            total_tx_bytes += tx
            except Exception:
                pass

            interfaces_list = list(interfaces_map.values())[:30]

            # 4. Bandwidth delta calculation
            now_ts = time.time()
            prev = _snmp_traffic_history.get(device.id)
            if prev:
                dt = max(now_ts - prev[0], 1.0)
                delta_rx = max(0, total_rx_bytes - prev[1])
                delta_tx = max(0, total_tx_bytes - prev[2])
                rx_kbps = round((delta_rx * 8.0) / (dt * 1000.0), 2)
                tx_kbps = round((delta_tx * 8.0) / (dt * 1000.0), 2)
            else:
                rx_kbps = 0.0
                tx_kbps = 0.0
            _snmp_traffic_history[device.id] = (now_ts, total_rx_bytes, total_tx_bytes)

            metrics = {
                "device_id": device.id,
                "cpu_load": cpu_load,
                "memory_usage": mem_usage,
                "memory_total": total_mem,
                "memory_free": free_mem,
                "uptime": uptime_str,
                "board_name": sys_descr[:50],
                "version": f"SNMP ({sys_name})",
                "rx_kbps": rx_kbps,
                "tx_kbps": tx_kbps,
                "latency_ms": latency_ms,
                "packet_loss": packet_loss,
                "min_rtt": min_rtt,
                "max_rtt": max_rtt,
                "wan_latency_ms": None,
                "wan_packet_loss": None,
                "interfaces": interfaces_list,
                "dhcp_leases": [],
                "routes": []
            }

            # Update memory snapshot for frontend
            update_device_snapshot(device.id, metrics)

            # Write time-series data to InfluxDB asynchronously
            try:
                await asyncio.to_thread(influx_db.write_metrics, str(device.id), device.name, device.host, {
                    "cpu_load": cpu_load,
                    "memory_usage": mem_usage,
                    "rx_kbps": rx_kbps,
                    "tx_kbps": tx_kbps,
                    "latency_ms": latency_ms,
                    "packet_loss": packet_loss,
                })
            except Exception as db_err:
                logger.debug(f"Influx write skipped for SNMP {device.host}: {db_err}")

            logger.info(f"Successfully collected SNMP from {device.name} ({device.host}): CPU {cpu_load}%, Mem {mem_usage}%, Ping {latency_ms}ms, {len(interfaces_list)} ifaces")
            return metrics

        except Exception as e:
            logger.error(f"Error collecting SNMP for {device.host}: {e}", exc_info=True)
            if icmp_stat.get("success"):
                m = {
                    "device_id": device.id,
                    "cpu_load": 0.0,
                    "memory_usage": 0.0,
                    "latency_ms": latency_ms,
                    "packet_loss": packet_loss,
                    "uptime": "ICMP Online",
                    "board_name": device.name,
                    "version": "SNMP Error",
                    "rx_kbps": 0.0,
                    "tx_kbps": 0.0,
                    "interfaces": []
                }
                update_device_snapshot(device.id, m)
                return m
            return None
