import asyncio
import logging
import time
from typing import Dict, Any, Tuple
from app.collectors.base import BaseCollector
from app.models.device import Device
from app.influxdb import influx_db
from app.services.metrics_service import update_device_snapshot
from app.services.icmp_service import ping_host, parse_mikrotik_ping_results
from librouteros import connect

logger = logging.getLogger("nova.collector.mikrotik")

# Track previous traffic counters for bandwidth calculation: device_id -> (timestamp, rx_bytes, tx_bytes)
_traffic_history: Dict[int, Tuple[float, int, int]] = {}
_interface_traffic_history: Dict[Tuple[int, str], Tuple[float, int, int]] = {}

class MikrotikCollector(BaseCollector):
    async def collect(self, device: Device) -> dict:
        # Measure Server-to-Device ICMP ping (NOVA Pulse)
        icmp_stat = await ping_host(device.host, count=4, timeout=1.0)
        latency_ms = icmp_stat.get("latency_ms", 0.0)
        packet_loss = icmp_stat.get("packet_loss", 0.0)
        min_rtt = icmp_stat.get("min_rtt", 0.0)
        max_rtt = icmp_stat.get("max_rtt", 0.0)

        def fetch():
            api = None
            try:
                port = device.port or 8728
                api = connect(
                    username=device.username or "admin",
                    password=device.password or "",
                    host=device.host,
                    port=port,
                    timeout=5
                )
                
                # 1. Fetch system resource (positional argument required by librouteros Api.__call__)
                res_gen = api('/system/resource/print')
                resource = list(res_gen)[0] if res_gen else {}
                
                cpu_load = float(resource.get('cpu-load') or 0.0)
                total_mem = int(resource.get('total-memory') or 1)
                free_mem = int(resource.get('free-memory') or 0)
                used_mem = max(0, total_mem - free_mem)
                mem_usage = round((used_mem / total_mem) * 100.0, 2) if total_mem > 0 else 0.0
                uptime = str(resource.get('uptime', '0s'))
                board_name = str(resource.get('board-name', 'RouterOS'))
                version = str(resource.get('version', 'Unknown'))
                
                # 2. Fetch interfaces
                interfaces = []
                total_rx_bytes = 0
                total_tx_bytes = 0
                try:
                    for item in api('/interface/print'):
                        rx = int(item.get('rx-byte') or 0)
                        tx = int(item.get('tx-byte') or 0)
                        total_rx_bytes += rx
                        total_tx_bytes += tx
                        
                        running_val = item.get('running')
                        is_running = running_val is True or str(running_val).lower() == 'true'
                        disabled_val = item.get('disabled')
                        is_disabled = disabled_val is True or str(disabled_val).lower() == 'true'
                        
                        interfaces.append({
                            "name": str(item.get('name', 'eth')),
                            "type": str(item.get('type', 'ether')),
                            "rx_bytes": rx,
                            "tx_bytes": tx,
                            "running": is_running,
                            "disabled": is_disabled
                        })
                except Exception as iface_err:
                    logger.warning(f"Could not fetch interfaces for {device.host}: {iface_err}")

                # 3. Fetch DHCP Leases (limit to top 150 to keep payload performant)
                dhcp_leases = []
                try:
                    count = 0
                    for lease in api('/ip/dhcp-server/lease/print'):
                        dhcp_leases.append({
                            "address": str(lease.get('address', '')),
                            "mac_address": str(lease.get('mac-address', '')),
                            "host_name": str(lease.get('host-name') or lease.get('comment') or 'Klien'),
                            "status": str(lease.get('status', 'bound'))
                        })
                        count += 1
                        if count >= 150:
                            break
                except Exception as dhcp_err:
                    logger.debug(f"DHCP leases fetch info for {device.host}: {dhcp_err}")

                # 4. Fetch Routes (limit to top 100)
                routes = []
                try:
                    count = 0
                    for r in api('/ip/route/print'):
                        routes.append({
                            "dst_address": str(r.get('dst-address', '')),
                            "gateway": str(r.get('gateway', '')),
                            "distance": int(r.get('distance') or 1)
                        })
                        count += 1
                        if count >= 100:
                            break
                except Exception as route_err:
                    logger.debug(f"Routes fetch info for {device.host}: {route_err}")

                # 5. Measure Router-to-WAN Ping (Internet quality)
                wan_latency_ms = 0.0
                wan_packet_loss = 0.0
                try:
                    raw_pings = list(api('/tool/ping', address='8.8.8.8', count=3))
                    wan_stat = parse_mikrotik_ping_results(raw_pings)
                    wan_latency_ms = wan_stat.get("wan_latency_ms", 0.0)
                    wan_packet_loss = wan_stat.get("wan_packet_loss", 0.0)
                except Exception as wan_err:
                    logger.debug(f"Router WAN ping failed for {device.host}: {wan_err}")

                # 6. Measure Dual-WAN Gateways Ping (JLM & ION)
                jlm_latency_ms = 0.0
                jlm_packet_loss = 0.0
                try:
                    jlm_raw = list(api('/tool/ping', address='119.18.156.153', count=3))
                    jlm_stat = parse_mikrotik_ping_results(jlm_raw)
                    jlm_latency_ms = jlm_stat.get("wan_latency_ms", 0.0)
                    jlm_packet_loss = jlm_stat.get("wan_packet_loss", 0.0)
                except Exception as jlm_err:
                    logger.debug(f"JLM gateway ping failed for {device.host}: {jlm_err}")

                ion_latency_ms = 0.0
                ion_packet_loss = 0.0
                try:
                    ion_raw = list(api('/tool/ping', address='210.79.164.65', count=3))
                    ion_stat = parse_mikrotik_ping_results(ion_raw)
                    ion_latency_ms = ion_stat.get("wan_latency_ms", 0.0)
                    ion_packet_loss = ion_stat.get("wan_packet_loss", 0.0)
                except Exception as ion_err:
                    logger.debug(f"ION gateway ping failed for {device.host}: {ion_err}")

                # Bandwidth calculation (rate over time)
                now_ts = time.time()
                prev = _traffic_history.get(device.id)
                if prev:
                    dt = max(now_ts - prev[0], 1.0)
                    delta_rx = max(0, total_rx_bytes - prev[1])
                    delta_tx = max(0, total_tx_bytes - prev[2])
                    # Rate in Kbps: (bytes * 8) / (dt * 1000)
                    rx_kbps = round((delta_rx * 8.0) / (dt * 1000.0), 2)
                    tx_kbps = round((delta_tx * 8.0) / (dt * 1000.0), 2)
                else:
                    rx_kbps = 0.0
                    tx_kbps = 0.0
                _traffic_history[device.id] = (now_ts, total_rx_bytes, total_tx_bytes)

                # Individual Throughput for JLM and ION interfaces (in Mbps)
                jlm_iface = next((i for i in interfaces if "sfplus1-jlm" in i["name"].lower() or "jlm" in i["name"].lower()), None)
                ion_iface = next((i for i in interfaces if "ge1-ion" in i["name"].lower() or "ion" in i["name"].lower()), None)

                jlm_rx_mbps = 0.0
                jlm_tx_mbps = 0.0
                jlm_status = "UP" if (jlm_iface and jlm_iface.get("running")) else "DOWN"
                if jlm_iface:
                    j_key = (device.id, jlm_iface["name"])
                    j_prev = _interface_traffic_history.get(j_key)
                    if j_prev:
                        j_dt = max(now_ts - j_prev[0], 1.0)
                        j_drx = max(0, jlm_iface["rx_bytes"] - j_prev[1])
                        j_dtx = max(0, jlm_iface["tx_bytes"] - j_prev[2])
                        jlm_rx_mbps = round((j_drx * 8.0) / (j_dt * 1000000.0), 2)
                        jlm_tx_mbps = round((j_dtx * 8.0) / (j_dt * 1000000.0), 2)
                    _interface_traffic_history[j_key] = (now_ts, jlm_iface["rx_bytes"], jlm_iface["tx_bytes"])

                ion_rx_mbps = 0.0
                ion_tx_mbps = 0.0
                ion_status = "UP" if (ion_iface and ion_iface.get("running")) else "DOWN"
                if ion_iface:
                    i_key = (device.id, ion_iface["name"])
                    i_prev = _interface_traffic_history.get(i_key)
                    if i_prev:
                        i_dt = max(now_ts - i_prev[0], 1.0)
                        i_drx = max(0, ion_iface["rx_bytes"] - i_prev[1])
                        i_dtx = max(0, ion_iface["tx_bytes"] - i_prev[2])
                        ion_rx_mbps = round((i_drx * 8.0) / (i_dt * 1000000.0), 2)
                        ion_tx_mbps = round((i_dtx * 8.0) / (i_dt * 1000000.0), 2)
                    _interface_traffic_history[i_key] = (now_ts, ion_iface["rx_bytes"], ion_iface["tx_bytes"])

                metrics = {
                    "device_id": device.id,
                    "cpu_load": cpu_load,
                    "memory_usage": mem_usage,
                    "memory_total": total_mem,
                    "memory_free": free_mem,
                    "uptime": uptime,
                    "board_name": board_name,
                    "version": version,
                    "rx_kbps": rx_kbps,
                    "tx_kbps": tx_kbps,
                    "latency_ms": latency_ms,
                    "packet_loss": packet_loss,
                    "min_rtt": min_rtt,
                    "max_rtt": max_rtt,
                    "wan_latency_ms": wan_latency_ms,
                    "wan_packet_loss": wan_packet_loss,
                    "jlm_latency_ms": jlm_latency_ms,
                    "jlm_packet_loss": jlm_packet_loss,
                    "jlm_rx_mbps": jlm_rx_mbps,
                    "jlm_tx_mbps": jlm_tx_mbps,
                    "jlm_status": jlm_status,
                    "ion_latency_ms": ion_latency_ms,
                    "ion_packet_loss": ion_packet_loss,
                    "ion_rx_mbps": ion_rx_mbps,
                    "ion_tx_mbps": ion_tx_mbps,
                    "ion_status": ion_status,
                    "interfaces": interfaces,
                    "dhcp_leases": dhcp_leases,
                    "routes": routes
                }

                # Update in-memory snapshot
                update_device_snapshot(device.id, metrics)

                # Write time-series data to InfluxDB
                try:
                    influx_db.write_metrics(str(device.id), device.name, device.host, {
                        "cpu_load": cpu_load,
                        "memory_usage": mem_usage,
                        "rx_kbps": rx_kbps,
                        "tx_kbps": tx_kbps,
                        "latency_ms": latency_ms,
                        "packet_loss": packet_loss,
                        "wan_latency_ms": wan_latency_ms,
                        "wan_packet_loss": wan_packet_loss,
                        "jlm_latency_ms": jlm_latency_ms,
                        "jlm_packet_loss": jlm_packet_loss,
                        "jlm_rx_mbps": jlm_rx_mbps,
                        "jlm_tx_mbps": jlm_tx_mbps,
                        "ion_latency_ms": ion_latency_ms,
                        "ion_packet_loss": ion_packet_loss,
                        "ion_rx_mbps": ion_rx_mbps,
                        "ion_tx_mbps": ion_tx_mbps,
                    })
                except Exception as db_err:
                    logger.debug(f"Influx write skipped or failed: {db_err}")

                logger.info(f"Successfully collected metrics from MikroTik {device.host} (CPU: {cpu_load}%, Mem: {mem_usage}%, JLM GW: {jlm_latency_ms}ms, ION GW: {ion_latency_ms}ms, WAN: {wan_latency_ms}ms)")
                return metrics

            except Exception as e:
                logger.warning(f"Error collecting from MikroTik {device.host}: {e}")
                return None
            finally:
                if api:
                    try:
                        api.close()
                    except Exception:
                        pass
        
        return await asyncio.to_thread(fetch)
