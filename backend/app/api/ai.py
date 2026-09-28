from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.services.ai_service import chat, analyze_network, analyze_device
from app.services.device_service import get_devices, get_device
from app.services.metrics_service import get_current_metrics
from app.core.dependencies import get_db, get_current_user, require_admin

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    device_id: Optional[int] = None

class AnalysisRequest(BaseModel):
    device_ids: Optional[List[int]] = None

@router.post("/analyze")
async def ai_analyze_network(
    request: Optional[AnalysisRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    devices = await get_devices(db)
    devices_data = []
    for d in devices:
        m = get_current_metrics(d.id) or {}
        devices_data.append({
            "id": d.id,
            "name": d.name,
            "host": d.host,
            "device_type": d.device_type.value,
            "status": d.status.value,
            "metrics": m
        })
    
    result = await analyze_network(devices_data)
    return result

@router.post("/analyze/{device_id}")
async def ai_analyze_single_device(
    device_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    device = await get_device(db, device_id)
    metrics = get_current_metrics(device_id) or {}
    device_data = {
        "id": device.id,
        "name": device.name,
        "host": device.host,
        "device_type": device.device_type.value,
        "status": device.status.value,
        "metrics": metrics
    }
    result = await analyze_device(device_data)
    return result

@router.post("/chat")
async def ai_chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    devices = await get_devices(db)
    
    # Build comprehensive live network context
    lines = ["Kondisi Telemetri Real-time Infrastruktur Jaringan NOVA NOC Saat Ini:"]
    for d in devices:
        m = get_current_metrics(d.id) or {}
        is_selected = (request.device_id is not None and d.id == request.device_id)
        tag = ">>> [PERANGKAT YANG SEDANG DIPILIH/DITANYAKAN] <<<" if is_selected else ""
        
        cpu = m.get("cpu_load", 0)
        mem = m.get("memory_usage", 0)
        uptime = m.get("uptime", "N/A")
        board = m.get("board_name", d.name)
        ver = m.get("version", "")
        rx = m.get("rx_kbps", 0)
        tx = m.get("tx_kbps", 0)
        ifaces = m.get("interfaces", [])
        running_ifaces = [i.get("name") for i in ifaces if i.get("running")]
        
        dev_line = (
            f"- Perangkat ID {d.id}: {d.name} ({d.host}) {tag}\n"
            f"  Status: {d.status.value}, Model: {board} (OS: {ver})\n"
            f"  Penggunaan CPU Real-time: {cpu}%, Penggunaan Memori: {mem}%, Uptime: {uptime}\n"
            f"  Trafik Akumulasi: RX {rx} Kbps, TX {tx} Kbps\n"
            f"  Total Interface: {len(ifaces)} terpasang ({len(running_ifaces)} aktif Up)"
        )
        if is_selected or len(devices) <= 5:
            if running_ifaces:
                dev_line += f"\n  Daftar Interface/VLAN Aktif (contoh): {', '.join(running_ifaces[:20])}"
            leases = m.get("dhcp_leases", [])
            routes = m.get("routes", [])
            if leases:
                dev_line += f"\n  DHCP Leases Aktif: {len(leases)} klien terdaftar"
            if routes:
                dev_line += f"\n  Tabel Routing: {len(routes)} entri rute aktif"
        lines.append(dev_line)
    
    context = "\n".join(lines)
    reply = await chat(request.message, context=context)
    return {"reply": reply}

@router.get("/health-score")
async def get_health_scores(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    devices = await get_devices(db)
    devices_data = []
    for d in devices:
        m = get_current_metrics(d.id) or {}
        devices_data.append({
            "id": d.id,
            "name": d.name,
            "host": d.host,
            "device_type": d.device_type.value,
            "status": d.status.value,
            "metrics": m
        })
    
    result = await analyze_network(devices_data, use_gemini=False)
    return {
        "overall_health_score": result["overall_health_score"],
        "devices": result["devices"],
        "recommendations": result["recommendations"]
    }

@router.get("/anomalies/active")
async def list_active_anomalies(current_user = Depends(get_current_user)):
    """Return all currently active traffic anomalies tracked by NOVA Sight."""
    from app.services.anomaly_service import get_active_anomalies
    return get_active_anomalies()

@router.get("/anomalies/history")
async def list_anomaly_history(limit: int = 20, current_user = Depends(get_current_user)):
    """Return recent historical traffic anomalies."""
    from app.services.anomaly_service import get_anomaly_history
    return get_anomaly_history(limit=limit)

@router.post("/anomalies/{device_id}/resolve")
async def resolve_device_anomaly(
    device_id: int,
    admin = Depends(require_admin)
):
    """Manually mark an active anomaly as resolved (Admin only)."""
    from app.services.anomaly_service import clear_anomaly
    clear_anomaly(device_id)
    return {"success": True, "message": f"Anomaly for device #{device_id} marked as resolved."}


