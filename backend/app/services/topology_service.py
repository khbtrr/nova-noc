import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.device import Device, DeviceType, DeviceStatus
from app.services.device_service import get_devices
from librouteros import connect

logger = logging.getLogger("nova.topology")

# In-memory cached topology graph
_cached_topology: Optional[Dict[str, Any]] = None
_last_scan_time: Optional[datetime] = None

def _classify_device_type(identity: str, platform: str, board: str, iface: str = "") -> str:
    """Classify device into wan, core, switch, or ap based on metadata and port."""
    ident_lower = (identity or "").lower()
    plat_lower = (platform or "").lower()
    board_lower = (board or "").lower()
    iface_lower = (iface or "").lower()
    combined = f"{ident_lower} {plat_lower} {board_lower} {iface_lower}"

    if any(k in iface_lower for k in ["sfplus1-jlm", "ge1-ion", "wan", "jlm", "ion"]):
        return "wan"
    if any(k in combined for k in ["uap", "u6-", "unifi", "apruang", "access point", "wifi", "wireless", "wap"]):
        return "ap"
    if any(k in combined for k in ["sw-", "switch", "cisco sg", "crs", "css", "edge-switch"]):
        return "switch"
    if any(k in combined for k in ["isp", "uplink", "gateway", "yayasan", "telkom", "indosat", "ion", "jlm", "rb5009"]):
        return "wan"
    return "switch" if "crs" in board_lower else "device"

async def scan_network_topology(db: AsyncSession, force_refresh: bool = False) -> Dict[str, Any]:
    global _cached_topology, _last_scan_time

    # Return cache if valid within 60s and not forced
    now = datetime.now(timezone.utc)
    if not force_refresh and _cached_topology and _last_scan_time:
        if (now - _last_scan_time).total_seconds() < 60:
            return _cached_topology

    devices = await get_devices(db)
    mikrotik_devices = [d for d in devices if d.device_type == DeviceType.MIKROTIK and d.is_enabled]

    # Map existing registered device IPs/hosts
    registered_hosts = {d.host: d for d in devices}
    registered_names = {d.name.lower(): d for d in devices}

    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    node_ids = set()

    # Track tier devices
    tier_wan_nodes = []
    tier_core_nodes = []
    tier_edge_nodes = []

    # 1. Place Core Routers (Tier 2)
    for dev in mikrotik_devices:
        core_node_id = f"core-{dev.id}"
        core_node = {
            "id": core_node_id,
            "type": "customTopology",
            "data": {
                "id": dev.id,
                "label": dev.name,
                "host": dev.host,
                "mac": "",
                "tier": "core",
                "device_type": "core_router",
                "vendor": "MikroTik",
                "board": "BITBOX TERA (x86)",
                "status": dev.status.value,
                "is_monitored": True,
                "interface": "Main Core Gateway"
            }
        }
        tier_core_nodes.append(core_node)
        node_ids.add(core_node_id)

    # 2. Collect neighbors from active core routers
    for dev in mikrotik_devices:
        core_node_id = f"core-{dev.id}"
        try:
            # Query neighbor print in thread pool
            def fetch_neighbors():
                conn = None
                try:
                    conn = connect(
                        username=dev.username or "admin",
                        password=dev.password or "",
                        host=dev.host,
                        port=dev.port or 8728,
                        timeout=5
                    )
                    return list(conn('/ip/neighbor/print'))
                except Exception as ce:
                    logger.warning(f"Could not connect to {dev.host} for neighbors: {ce}")
                    return []
                finally:
                    if conn:
                        try:
                            conn.close()
                        except Exception:
                            pass

            raw_neighbors = await asyncio.to_thread(fetch_neighbors)
            
            for idx, n in enumerate(raw_neighbors):
                identity = str(n.get("identity") or f"Neighbor-{idx}")
                address = str(n.get("address") or "")
                mac = str(n.get("mac-address") or "")
                platform = str(n.get("platform") or "")
                board = str(n.get("board") or "")
                iface = str(n.get("interface") or "")

                dev_tier = _classify_device_type(identity, platform, board, iface)
                
                # Check for JLM or ION specifically
                if "jlm" in iface.lower() or "jlm" in identity.lower():
                    dev_tier = "wan"
                    node_id = "wan-isp-jlm"
                    identity = "ISP JLM (Direct Fiber SFP+)"
                    platform = "Provider JLM"
                    board = "Direct SFP+ (10G)"
                    address = "119.18.156.153"
                    iface = "sfplus1-JLM"
                elif "ion" in iface.lower() or "ion" in identity.lower() or "yayasan" in identity.lower() or "rb5009" in board.lower():
                    dev_tier = "wan"
                    node_id = "wan-isp-ion"
                    identity = "ISP ION (Router RB5009)"
                    platform = "Provider ION"
                    board = "RB5009UG+S+"
                    address = "210.79.164.65"
                    iface = "ge1-ION"
                else:
                    safe_id = "".join(c if c.isalnum() else "_" for c in identity.strip() or f"n_{idx}")
                    node_id = f"{dev_tier}-{safe_id}"
                    if node_id in node_ids:
                        node_id = f"{node_id}-{idx}"

                if node_id in node_ids and dev_tier == "wan":
                    continue
                node_ids.add(node_id)

                # Check if already monitored in DB
                is_monitored = False
                monitored_device_id = None
                if address and address in registered_hosts:
                    is_monitored = True
                    monitored_device_id = registered_hosts[address].id
                elif identity.lower() in registered_names:
                    is_monitored = True
                    monitored_device_id = registered_names[identity.lower()].id

                neighbor_node = {
                    "id": node_id,
                    "type": "customTopology",
                    "data": {
                        "id": monitored_device_id or node_id,
                        "label": identity,
                        "host": address or "N/A",
                        "mac": mac,
                        "tier": dev_tier,
                        "device_type": dev_tier,
                        "vendor": platform or "Network Device",
                        "board": board or platform,
                        "status": "ONLINE" if is_monitored else "DISCOVERED",
                        "is_monitored": is_monitored,
                        "interface": iface
                    }
                }

                if dev_tier == "wan":
                    tier_wan_nodes.append(neighbor_node)
                    # Edge from WAN to Core
                    edges.append({
                        "id": f"edge-{node_id}-{core_node_id}",
                        "source": node_id,
                        "target": core_node_id,
                        "animated": True,
                        "label": iface,
                        "style": {"stroke": "#06b6d4" if "jlm" in node_id else "#38bdf8", "strokeWidth": 2}
                    })
                else:
                    tier_edge_nodes.append(neighbor_node)
                    # Edge from Core to Switch/AP
                    edges.append({
                        "id": f"edge-{core_node_id}-{node_id}",
                        "source": core_node_id,
                        "target": node_id,
                        "animated": False,
                        "label": iface,
                        "style": {"stroke": "#38bdf8" if dev_tier == "switch" else "#a855f7", "strokeWidth": 1.5}
                    })

            # Ensure both JLM and ION are present at Tier 1
            has_jlm = any(n["id"] == "wan-isp-jlm" for n in tier_wan_nodes)
            if not has_jlm:
                jlm_node = {
                    "id": "wan-isp-jlm",
                    "type": "customTopology",
                    "data": {
                        "id": "wan-isp-jlm",
                        "label": "ISP JLM (Direct Fiber SFP+)",
                        "host": "119.18.156.153",
                        "mac": "48:A9:8A:01:49:75",
                        "tier": "wan",
                        "device_type": "wan",
                        "vendor": "Provider JLM",
                        "board": "Direct SFP+ (10G Fiber)",
                        "status": "ONLINE",
                        "is_monitored": False,
                        "interface": "sfplus1-JLM"
                    }
                }
                tier_wan_nodes.append(jlm_node)
                edges.append({
                    "id": f"edge-wan-isp-jlm-{core_node_id}",
                    "source": "wan-isp-jlm",
                    "target": core_node_id,
                    "animated": True,
                    "label": "sfplus1-JLM (Fiber)",
                    "style": {"stroke": "#06b6d4", "strokeWidth": 2}
                })

            has_ion = any(n["id"] == "wan-isp-ion" for n in tier_wan_nodes)
            if not has_ion:
                ion_node = {
                    "id": "wan-isp-ion",
                    "type": "customTopology",
                    "data": {
                        "id": "wan-isp-ion",
                        "label": "ISP ION (Router RB5009)",
                        "host": "210.79.164.65",
                        "mac": "D0:EA:11:3E:AC:24",
                        "tier": "wan",
                        "device_type": "wan",
                        "vendor": "Provider ION",
                        "board": "RB5009UG+S+",
                        "status": "ONLINE",
                        "is_monitored": False,
                        "interface": "ge1-ION"
                    }
                }
                tier_wan_nodes.append(ion_node)
                edges.append({
                    "id": f"edge-wan-isp-ion-{core_node_id}",
                    "source": "wan-isp-ion",
                    "target": core_node_id,
                    "animated": True,
                    "label": "ge1-ION (Gigabit)",
                    "style": {"stroke": "#38bdf8", "strokeWidth": 2}
                })

        except Exception as e:
            logger.warning(f"Error scanning neighbors for device {dev.id}: {e}")

    # 3. Compute 3-Tier Layout Coordinates (X, Y)
    # Tier 1 (WAN / ISP Uplinks): Y = 60
    # Tier 2 (Core Routers): Y = 250
    # Tier 3 (Switches & APs): Y = 460 - 580

    TOTAL_WIDTH = max(len(tier_edge_nodes) * 220, 1200)

    # Place WAN nodes (Tier 1) side-by-side above Core Router
    wan_count = len(tier_wan_nodes)
    core_center_x = TOTAL_WIDTH / 2
    if wan_count == 2:
        tier_wan_nodes[0]["position"] = {"x": round(core_center_x - 220), "y": 60}
        tier_wan_nodes[1]["position"] = {"x": round(core_center_x + 120), "y": 60}
        for n in tier_wan_nodes:
            nodes.append(n)
    else:
        wan_spacing = TOTAL_WIDTH / (max(wan_count, 1) + 1)
        for i, n in enumerate(tier_wan_nodes):
            n["position"] = {"x": round((i + 1) * wan_spacing - 100), "y": 60}
            nodes.append(n)

    # Place Core nodes (Tier 2)
    core_count = max(len(tier_core_nodes), 1)
    core_spacing = TOTAL_WIDTH / (core_count + 1)
    for i, n in enumerate(tier_core_nodes):
        n["position"] = {"x": round((i + 1) * core_spacing - 100), "y": 240}
        nodes.append(n)

    # Place Edge nodes (Tier 3: Switches on left/center, APs clustered)
    switches = [n for n in tier_edge_nodes if n["data"]["tier"] == "switch"]
    aps = [n for n in tier_edge_nodes if n["data"]["tier"] != "switch"]
    ordered_edges = switches + aps

    edge_count = max(len(ordered_edges), 1)
    for i, n in enumerate(ordered_edges):
        # Stagger row slightly (two rows) to avoid overlapping wide labels
        y_offset = 450 if (i % 2 == 0) else 600
        n["position"] = {"x": round(i * 240 + 50), "y": y_offset}
        nodes.append(n)

    _cached_topology = {
        "nodes": nodes,
        "edges": edges,
        "summary": {
            "total_nodes": len(nodes),
            "wan_count": len(tier_wan_nodes),
            "core_count": len(tier_core_nodes),
            "switch_count": len(switches),
            "ap_count": len(aps),
            "edges_count": len(edges),
            "last_scan": now.isoformat()
        }
    }
    _last_scan_time = now
    return _cached_topology

async def promote_neighbor_to_device(db: AsyncSession, neighbor_data: Dict[str, Any]) -> Device:
    """Register a discovered neighbor as an official monitored Device in NOVA."""
    name = neighbor_data.get("label") or neighbor_data.get("name") or "Perangkat Terdeteksi"
    host = neighbor_data.get("host")
    if not host or host == "N/A":
        raise ValueError("Perangkat tidak memiliki alamat IP valid untuk dimonitor.")

    # Check if already exists
    res = await db.execute(select(Device).filter(Device.host == host))
    existing = res.scalar_one_or_none()
    if existing:
        return existing

    vendor = (neighbor_data.get("vendor") or "").lower()
    board = (neighbor_data.get("board") or "").lower()
    dev_type = DeviceType.MIKROTIK if ("mikrotik" in vendor or "crs" in board or "rb" in board) else DeviceType.SNMP

    tier = neighbor_data.get("tier", "switch")
    group_name = "Core Infrastructure" if tier == "core" else ("Distribution & Access" if tier == "switch" else "Access Points")

    new_device = Device(
        name=name,
        host=host,
        device_type=dev_type,
        port=8728 if dev_type == DeviceType.MIKROTIK else 161,
        username="nova" if dev_type == DeviceType.MIKROTIK else None,
        snmp_community="public" if dev_type == DeviceType.SNMP else None,
        snmp_version="v2c",
        poll_interval=60,
        is_enabled=True,
        group=group_name,
        location=neighbor_data.get("interface", "Main Network"),
        status=DeviceStatus.OFFLINE,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )

    db.add(new_device)
    await db.commit()
    await db.refresh(new_device)

    # Register in scheduler
    try:
        from app.collectors.scheduler import update_device_job
        await update_device_job(new_device.id, new_device.poll_interval or 60)
    except Exception as se:
        logger.warning(f"Could not register device {new_device.id} in scheduler: {se}")

    # Invalidate topology cache to show new monitored badge
    global _cached_topology
    _cached_topology = None

    return new_device
