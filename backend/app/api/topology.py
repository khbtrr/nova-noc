from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional
from pydantic import BaseModel

from app.core.dependencies import get_db
from app.services.topology_service import scan_network_topology, promote_neighbor_to_device

router = APIRouter()

class PromoteRequest(BaseModel):
    label: str
    host: str
    vendor: Optional[str] = None
    board: Optional[str] = None
    tier: Optional[str] = "switch"
    interface: Optional[str] = ""

@router.get("")
async def get_topology(db: AsyncSession = Depends(get_db)):
    """Fetch current 3-tier network topology graph."""
    data = await scan_network_topology(db, force_refresh=False)
    return data

@router.post("/scan")
async def trigger_rescan(db: AsyncSession = Depends(get_db)):
    """Trigger active live scan from core router neighbor table."""
    data = await scan_network_topology(db, force_refresh=True)
    return {
        "status": "success",
        "message": f"Pemindaian topologi selesai. Ditemukan {data['summary']['total_nodes']} perangkat terhubung.",
        "data": data
    }

@router.post("/promote")
async def promote_device(req: PromoteRequest, db: AsyncSession = Depends(get_db)):
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
