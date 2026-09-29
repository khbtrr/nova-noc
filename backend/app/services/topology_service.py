import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.device import Device, DeviceType, DeviceStatus
from app.models.topology_layout import TopologyLayout
from app.services.device_service import get_devices
from app.core.crypto import decrypt_credential
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
    if any(k in combined for k in ["uap", "u6-", "unifi", "apruang", "apbussines", "access point", "wifi", "wireless", "wap"]):
        return "ap"
    if any(k in combined for k in ["sw-", "switch", "cisco", "crs", "css", "cbs250", "edge-switch", "sg220"]):
        return "switch"
    if any(k in combined for k in ["isp", "uplink", "gateway", "yayasan", "telkom", "indosat", "ion", "jlm", "rb5009"]):
        return "wan"
    return "switch" if ("crs" in board_lower or "css" in board_lower) else "device"

async def build_smart_baseline_topology(db: AsyncSession) -> Dict[str, Any]:
    """
    Constructs the true physical network hierarchy:
    Tier 1: Dual-WAN Uplinks (ISP JLM & ISP ION)
    Tier 2: Core Router (Router Utama - Bitbox Tera)
    Tier 2.5: Main Aggregation Switch (CRS317-1G-16S+)
    Tier 3: Distribution Switches (Gedung 1..4, Adm, Dept TIK, CBS250)
    Tier 4: Access Points connected to building switches & Remote Tunnels
    """
    devices = await get_devices(db)
    mikrotik_devices = [d for d in devices if d.device_type == DeviceType.MIKROTIK and d.is_enabled]
    db_switches = [d for d in devices if d.device_type == DeviceType.SNMP and d.is_enabled]
    registered_hosts = {d.host: d for d in devices if d.host}

    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    node_ids = set()

    tier_wan_nodes: List[Dict[str, Any]] = []
    tier_core_nodes: List[Dict[str, Any]] = []
    main_switch_node: Optional[Dict[str, Any]] = None
    dist_switches: List[Dict[str, Any]] = []
    ap_nodes: List[Dict[str, Any]] = []
    other_nodes: List[Dict[str, Any]] = []

    # 1. Core Router (Bitbox Tera)
    primary_core_id = "core-5"
    if mikrotik_devices:
        dev = mikrotik_devices[0]
        primary_core_id = f"core-{dev.id}"
        core_node = {
            "id": primary_core_id,
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
        node_ids.add(primary_core_id)

    # 2. Dual-WAN Gateway Nodes (ISP JLM & ISP ION)
    wan_jlm = {
        "id": "wan-isp-jlm",
        "type": "customTopology",
        "data": {
            "id": "wan-isp-jlm",
            "label": "ISP JLM (Direct Fiber SFP+)",
            "host": "119.18.156.153",
            "mac": "",
            "tier": "wan",
            "device_type": "wan",
            "vendor": "Provider JLM",
            "board": "Direct SFP+ (10G)",
            "status": "ONLINE",
            "is_monitored": True,
            "interface": "sfplus1-JLM"
        }
    }
    wan_ion = {
        "id": "wan-isp-ion",
        "type": "customTopology",
        "data": {
            "id": "wan-isp-ion",
            "label": "ISP ION (Router RB5009)",
            "host": "210.79.164.65",
            "mac": "",
            "tier": "wan",
            "device_type": "wan",
            "vendor": "Provider ION",
            "board": "RB5009UG+S+",
            "status": "ONLINE",
            "is_monitored": True,
            "interface": "ge1-ION"
        }
    }
    tier_wan_nodes.extend([wan_jlm, wan_ion])
    node_ids.update(["wan-isp-jlm", "wan-isp-ion"])

    # WAN -> Core Router Edges
    edges.append({
        "id": f"edge-wan-isp-jlm-{primary_core_id}",
        "source": "wan-isp-jlm",
        "target": primary_core_id,
        "animated": True,
        "label": "sfplus1-JLM (10G)",
        "style": {"stroke": "#06b6d4", "strokeWidth": 2}
    })
    edges.append({
        "id": f"edge-wan-isp-ion-{primary_core_id}",
        "source": "wan-isp-ion",
        "target": primary_core_id,
        "animated": True,
        "label": "ge1-ION (1G)",
        "style": {"stroke": "#38bdf8", "strokeWidth": 2}
    })

    # 3. Collect Neighbors from MikroTik
    raw_neighbors = []
    if mikrotik_devices:
        core_dev = mikrotik_devices[0]
        def fetch_neighbors():
            conn = None
            try:
                plain_password = decrypt_credential(core_dev.password) if core_dev.password else ""
                conn = connect(
                    username=core_dev.username or "admin",
                    password=plain_password,
                    host=core_dev.host,
                    port=core_dev.port or 8728,
                    timeout=5
                )
                return list(conn('/ip/neighbor/print'))
            except Exception as ce:
                logger.warning(f"Could not connect to {core_dev.host} for neighbors: {ce}")
                return []
            finally:
                if conn:
                    try:
                        conn.close()
                    except Exception:
                        pass
        raw_neighbors = await asyncio.to_thread(fetch_neighbors)

    # Map neighbor metadata
    placed_switch_ids = set()
    main_switch_id = "switch-MAIN_SWITCH"

    # Helper function to match neighbor to registered DB device
    def match_registered_device(address: str, ident: str) -> Optional[Device]:
        if address and address in registered_hosts:
            return registered_hosts[address]
        ident_clean = ident.lower().replace("-", " ").strip()
        for d in devices:
            d_name = d.name.lower().replace("-", " ")
            if ident_clean and (ident_clean in d_name or d_name in ident_clean):
                return d
        return None

    # Process Discovered Neighbors
    for idx, n in enumerate(raw_neighbors):
        identity = str(n.get("identity") or f"Neighbor-{idx}")
        address = str(n.get("address") or "")
        mac = str(n.get("mac-address") or "")
        platform = str(n.get("platform") or "")
        board = str(n.get("board") or "")
        iface = str(n.get("interface") or "")

        dev_tier = _classify_device_type(identity, platform, board, iface)

        # Skip WAN neighbors as they are already statically initialized
        if dev_tier == "wan" or "jlm" in iface.lower() or "ion" in iface.lower():
            continue

        matched_db_dev = match_registered_device(address, identity)
        is_monitored = False
        monitored_device_id = None
        status_val = "DISCOVERED"

        if matched_db_dev:
            is_monitored = True
            monitored_device_id = matched_db_dev.id
            status_val = matched_db_dev.status.value
            if matched_db_dev.device_type == DeviceType.SNMP:
                placed_switch_ids.add(matched_db_dev.id)

        safe_id = "".join(c if c.isalnum() else "_" for c in identity.strip() or f"n_{idx}")
        node_id = f"{dev_tier}-{safe_id}"
        if node_id in node_ids:
            node_id = f"{node_id}-{idx}"
        node_ids.add(node_id)

        node_item = {
            "id": node_id,
            "type": "customTopology",
            "data": {
                "id": monitored_device_id or node_id,
                "label": matched_db_dev.name if matched_db_dev else identity,
                "host": address or (matched_db_dev.host if matched_db_dev else "N/A"),
                "mac": mac,
                "tier": dev_tier,
                "device_type": dev_tier,
                "vendor": platform or "Network Device",
                "board": board or platform or "Generic",
                "status": status_val,
                "is_monitored": is_monitored,
                "interface": iface
            }
        }

        # Check if this is Main Switch (CRS317)
        if (matched_db_dev and matched_db_dev.id == 7) or "crs317" in board.lower() or "main-switch" in identity.lower():
            main_switch_id = node_id
            main_switch_node = node_item
        elif dev_tier == "switch":
            dist_switches.append(node_item)
        elif dev_tier == "ap":
            ap_nodes.append(node_item)
        else:
            other_nodes.append(node_item)

    # Guarantee all 12 registered DB Switches are present
    for sw in db_switches:
        if sw.id in placed_switch_ids:
            continue
        sw_node_id = f"switch-dev-{sw.id}"
        if sw_node_id in node_ids:
            continue
        node_ids.add(sw_node_id)
        placed_switch_ids.add(sw.id)

        sw_node = {
            "id": sw_node_id,
            "type": "customTopology",
            "data": {
                "id": sw.id,
                "label": sw.name,
                "host": sw.host,
                "mac": "",
                "tier": "switch",
                "device_type": "switch",
                "vendor": "MikroTik" if ("crs" in sw.name.lower() or "css" in sw.name.lower()) else ("Cisco" if "sg220" in sw.name.lower() else "Switch"),
                "board": sw.name.split("-")[-1].strip() if "-" in sw.name else "Switch",
                "status": sw.status.value,
                "is_monitored": True,
                "interface": sw.location or "sfplus2-SW"
            }
        }
        if sw.id == 7 or "crs317" in sw.name.lower():
            main_switch_id = sw_node_id
            main_switch_node = sw_node
        else:
            dist_switches.append(sw_node)

    # 4. Construct True Physical Edges
    # Edge: Core Router -> Main Switch CRS317
    if main_switch_node:
        edges.append({
            "id": f"edge-{primary_core_id}-{main_switch_id}",
            "source": primary_core_id,
            "target": main_switch_id,
            "animated": True,
            "label": "sfplus2-SW (10G Fiber Trunk)",
            "style": {"stroke": "#06b6d4", "strokeWidth": 2.5}
        })

    # Edges: Main Switch CRS317 -> All Distribution Switches
    for sw in dist_switches:
        sw_id = sw["id"]
        label_text = sw["data"].get("interface") or "Trunk 10G/1G"
        edges.append({
            "id": f"edge-{main_switch_id}-{sw_id}",
            "source": main_switch_id,
            "target": sw_id,
            "animated": False,
            "label": label_text,
            "style": {"stroke": "#38bdf8", "strokeWidth": 1.5}
        })

    # Edges: Distribution Switches -> AP Ruang
    # Map AP to corresponding switch by name/location
    switch_by_keyword = {}
    for sw in dist_switches:
        name_l = sw["data"]["label"].lower()
        if "adm" in name_l:
            switch_by_keyword["adm"] = sw["id"]
        if "gd4" in name_l and "lt2" in name_l:
            switch_by_keyword["gd4_lt2"] = sw["id"]
        if "gd4" in name_l and "lt3" in name_l:
            switch_by_keyword["gd4_lt3"] = sw["id"]
        if "gp1" in name_l or "gd1" in name_l:
            switch_by_keyword["gp1"] = sw["id"]
        if "gp3" in name_l or "gd3" in name_l:
            switch_by_keyword["gd3"] = sw["id"]

    for ap in ap_nodes:
        ap_id = ap["id"]
        ap_label = ap["data"]["label"].lower()
        target_parent = None

        if any(k in ap_label for k in ["kepsek", "tu", "guru", "koperasi"]):
            target_parent = switch_by_keyword.get("adm")
        elif "wakil" in ap_label:
            target_parent = switch_by_keyword.get("gd4_lt2")
        elif "bph" in ap_label:
            target_parent = switch_by_keyword.get("gd4_lt3")
        elif "bussines" in ap_label:
            target_parent = switch_by_keyword.get("gp1")

        if not target_parent:
            target_parent = main_switch_id

        edges.append({
            "id": f"edge-{target_parent}-{ap_id}",
            "source": target_parent,
            "target": ap_id,
            "animated": False,
            "label": "PoE Gigabit",
            "style": {"stroke": "#a855f7", "strokeWidth": 1.5}
        })

    # Edges: Remote Routers/Tunnels -> Core Router
    for dev_node in other_nodes:
        edges.append({
            "id": f"edge-{primary_core_id}-{dev_node['id']}",
            "source": primary_core_id,
            "target": dev_node["id"],
            "animated": False,
            "label": dev_node["data"].get("interface") or "Tunnel",
            "style": {"stroke": "#eab308", "strokeWidth": 1.5}
        })

    # 5. Calculate Symmetrical 4-Tier Coordinates
    # Canvas Sizing
    total_dist = len(dist_switches)
    TOTAL_WIDTH = max(total_dist * 260 + 200, 2000)
    core_center_x = TOTAL_WIDTH / 2

    # Tier 1 (WAN Uplinks): Y = 50
    wan_jlm["position"] = {"x": round(core_center_x - 200), "y": 50}
    wan_ion["position"] = {"x": round(core_center_x + 80), "y": 50}
    nodes.extend(tier_wan_nodes)

    # Tier 2 (Core Router): Y = 190
    for n in tier_core_nodes:
        n["position"] = {"x": round(core_center_x - 60), "y": 190}
        nodes.append(n)

    # Tier 2.5 (Main Aggregation Switch CRS317): Y = 340
    if main_switch_node:
        main_switch_node["position"] = {"x": round(core_center_x - 60), "y": 340}
        nodes.append(main_switch_node)

    # Tier 3 (Distribution Switches): Y = 490 / 620 (Staggered 2 Rows)
    sw_spacing = TOTAL_WIDTH / (max(total_dist, 1) + 1)
    for i, sw in enumerate(dist_switches):
        y_offset = 490 if (i % 2 == 0) else 620
        sw["position"] = {"x": round((i + 1) * sw_spacing - 100), "y": y_offset}
        nodes.append(sw)

    # Tier 4 (Access Points & Tunnels): Y = 780 / 910 (Staggered 2 Rows)
    tier4_devices = ap_nodes + other_nodes
    total_t4 = len(tier4_devices)
    t4_spacing = TOTAL_WIDTH / (max(total_t4, 1) + 1)
    for j, ap in enumerate(tier4_devices):
        y_offset = 780 if (j % 2 == 0) else 910
        ap["position"] = {"x": round((j + 1) * t4_spacing - 100), "y": y_offset}
        nodes.append(ap)

    all_switches = ([main_switch_node] if main_switch_node else []) + dist_switches

    now = datetime.now(timezone.utc)
    return {
        "nodes": nodes,
        "edges": edges,
        "summary": {
            "total_nodes": len(nodes),
            "wan_count": len(tier_wan_nodes),
            "core_count": len(tier_core_nodes),
            "switch_count": len(all_switches),
            "ap_count": len(ap_nodes),
            "edges_count": len(edges),
            "is_custom_layout": False,
            "last_scan": now.isoformat()
        }
    }

async def scan_network_topology(db: AsyncSession, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Fetches the effective topology graph:
    1. If custom layout is saved in PostgreSQL (`topology_layouts`), loads custom nodes & edges,
       then non-destructively refreshes live ONLINE/OFFLINE status and metrics.
    2. Otherwise, returns the smart baseline physical hierarchy.
    """
    global _cached_topology, _last_scan_time

    now = datetime.now(timezone.utc)
    if not force_refresh and _cached_topology and _last_scan_time:
        if (now - _last_scan_time).total_seconds() < 30:
            return _cached_topology

    # Check for custom layout in database
    res = await db.execute(select(TopologyLayout).filter(TopologyLayout.name == "default"))
    custom_layout = res.scalar_one_or_none()

    if custom_layout and custom_layout.nodes:
        # Load custom nodes and edges
        devices = await get_devices(db)
        dev_by_id = {d.id: d for d in devices}
        dev_by_host = {d.host: d for d in devices if d.host}

        updated_nodes = []
        for n in custom_layout.nodes:
            node_copy = dict(n)
            data = dict(node_copy.get("data", {}))

            # Non-destructive live status sync
            matched_dev = None
            if "id" in data and isinstance(data["id"], int) and data["id"] in dev_by_id:
                matched_dev = dev_by_id[data["id"]]
            elif data.get("host") in dev_by_host:
                matched_dev = dev_by_host[data["host"]]

            if matched_dev:
                data["status"] = matched_dev.status.value
                data["is_monitored"] = True
                data["label"] = matched_dev.name

            node_copy["data"] = data
            updated_nodes.append(node_copy)

        switches_count = sum(1 for n in updated_nodes if n.get("data", {}).get("tier") == "switch")
        wan_count = sum(1 for n in updated_nodes if n.get("data", {}).get("tier") == "wan")
        core_count = sum(1 for n in updated_nodes if n.get("data", {}).get("tier") == "core")
        ap_count = sum(1 for n in updated_nodes if n.get("data", {}).get("tier") == "ap")

        _cached_topology = {
            "nodes": updated_nodes,
            "edges": custom_layout.edges or [],
            "summary": {
                "total_nodes": len(updated_nodes),
                "wan_count": wan_count,
                "core_count": core_count,
                "switch_count": switches_count,
                "ap_count": ap_count,
                "edges_count": len(custom_layout.edges or []),
                "is_custom_layout": True,
                "last_scan": now.isoformat()
            }
        }
        _last_scan_time = now
        return _cached_topology

    # If no custom layout, return smart baseline physical hierarchy
    baseline = await build_smart_baseline_topology(db)
    _cached_topology = baseline
    _last_scan_time = now
    return _cached_topology

async def save_custom_topology(db: AsyncSession, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Saves custom node positions, custom connections, and custom devices to PostgreSQL."""
    global _cached_topology

    res = await db.execute(select(TopologyLayout).filter(TopologyLayout.name == "default"))
    layout = res.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if layout:
        layout.nodes = nodes
        layout.edges = edges
        layout.updated_at = now
    else:
        layout = TopologyLayout(
            name="default",
            nodes=nodes,
            edges=edges,
            created_at=now,
            updated_at=now
        )
        db.add(layout)

    await db.commit()
    await db.refresh(layout)

    _cached_topology = None
    return await scan_network_topology(db, force_refresh=True)

async def reset_custom_topology(db: AsyncSession) -> Dict[str, Any]:
    """Resets saved custom layout and reverts back to smart physical baseline hierarchy."""
    global _cached_topology

    res = await db.execute(select(TopologyLayout).filter(TopologyLayout.name == "default"))
    layout = res.scalar_one_or_none()
    if layout:
        await db.delete(layout)
        await db.commit()

    _cached_topology = None
    return await scan_network_topology(db, force_refresh=True)

async def promote_neighbor_to_device(db: AsyncSession, neighbor_data: Dict[str, Any]) -> Device:
    """Register a discovered neighbor as an official monitored Device in NOVA."""
    name = neighbor_data.get("label") or neighbor_data.get("name") or "Perangkat Terdeteksi"
    host = neighbor_data.get("host")
    if not host or host == "N/A":
        raise ValueError("Perangkat tidak memiliki alamat IP valid untuk dimonitor.")

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

    try:
        from app.collectors.scheduler import update_device_job
        await update_device_job(new_device.id, new_device.poll_interval or 60)
    except Exception as se:
        logger.warning(f"Could not register device {new_device.id} in scheduler: {se}")

    global _cached_topology
    _cached_topology = None

    return new_device
