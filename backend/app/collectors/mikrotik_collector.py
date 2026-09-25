import asyncio
import logging
import time
from typing import Dict, Any, Tuple
from app.collectors.base import BaseCollector
from app.models.device import Device
from app.influxdb import influx_db
from app.services.metrics_service import update_device_snapshot
from librouteros import connect

logger = logging.getLogger("nova.collector.mikrotik")

# Track previous traffic counters for bandwidth calculation: device_id -> (timestamp, rx_bytes, tx_bytes)
_traffic_history: Dict[int, Tuple[float, int, int]] = {}

class MikrotikCollector(BaseCollector):
    async def collect(self, device: Device) -> dict:
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
                        "tx_kbps": tx_kbps
                    })
                except Exception as db_err:
                    logger.debug(f"Influx write skipped or failed: {db_err}")

                logger.info(f"Successfully collected metrics from MikroTik {device.host} (CPU: {cpu_load}%, Mem: {mem_usage}%, Ifaces: {len(interfaces)})")
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
