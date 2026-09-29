from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from app.core.dependencies import get_db, get_current_user, require_admin
from app.services.topology_service import (
    scan_network_topology, 
    promote_neighbor_to_device,
    save_custom_topology,
    reset_custom_topology
)

router = APIRouter()

class PromoteRequest(BaseModel):
    label: str
    host: str
    vendor: Optional[str] = None
    board: Optional[str] = None
    tier: Optional[str] = "switch"
    interface: Optional[str] = ""

class SaveTopologyRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

@router.get("")
async def get_topology(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Fetch current network topology graph (custom layout or smart baseline)."""
    data = await scan_network_topology(db, force_refresh=False)
    return data

@router.post("/scan")
async def trigger_rescan(
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin)
):
    """Trigger active live scan without overwriting user custom coordinates/edges."""
    data = await scan_network_topology(db, force_refresh=True)
    return {
        "status": "success",
        "message": f"Pemindaian topologi selesai. Ditemukan {data['summary']['total_nodes']} perangkat terhubung.",
        "data": data
    }

@router.post("/save")
async def save_topology(
    req: SaveTopologyRequest,
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin)
):
    """Save custom node positions, custom connections, and custom devices to database."""
    try:
        data = await save_custom_topology(db, req.nodes, req.edges)
        return {
            "status": "success",
            "message": "Tata letak topologi kustom berhasil disimpan secara permanen.",
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan topologi kustom: {e}")

@router.post("/reset")
async def reset_topology(
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin)
):
    """Reset saved custom layout and revert back to smart physical baseline hierarchy."""
    try:
        data = await reset_custom_topology(db)
        return {
            "status": "success",
            "message": "Topologi berhasil direset ke hierarki fisik standar.",
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mereset topologi: {e}")

@router.post("/promote")
async def promote_device(
    req: PromoteRequest,
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin)
):
    """Promote a discovered neighbor to monitored Device table."""
    try:
        dev = await promote_neighbor_to_device(db, req.model_dump())
        return {
            "status": "success",
            "message": f"Perangkat {dev.name} ({dev.host}) berhasil ditambahkan ke daftar monitoring.",
            "device": {
                "id": dev.id,
                "name": dev.name,
                "host": dev.host,
                "device_type": dev.device_type.value
            }
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mempromosikan perangkat: {e}")
