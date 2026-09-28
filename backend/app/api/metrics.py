from fastapi import APIRouter, Query, Depends
from typing import List, Dict, Any
from app.services.metrics_service import (
    get_current_metrics,
    get_metrics_history,
    get_device_interfaces,
    get_device_dhcp_leases,
    get_device_routes,
)
from app.schemas.metrics import InterfaceStats, DHCPLease, RouteEntry
from app.core.dependencies import get_current_user

router = APIRouter()

@router.get("/{device_id}")
async def read_current_metrics(device_id: int, current_user = Depends(get_current_user)):
    data = get_current_metrics(device_id)
    return data or {"device_id": device_id, "detail": "No metrics available"}

@router.get("/{device_id}/history")
async def read_metrics_history(device_id: int, range: str = Query("1h"), current_user = Depends(get_current_user)):
    return get_metrics_history(device_id, range)

@router.get("/{device_id}/interfaces", response_model=List[InterfaceStats])
async def read_device_interfaces(device_id: int, current_user = Depends(get_current_user)):
    return get_device_interfaces(device_id)

@router.get("/{device_id}/dhcp", response_model=List[DHCPLease])
async def read_device_dhcp(device_id: int, current_user = Depends(get_current_user)):
    return get_device_dhcp_leases(device_id)

@router.get("/{device_id}/routes", response_model=List[RouteEntry])
async def read_device_routes(device_id: int, current_user = Depends(get_current_user)):
    return get_device_routes(device_id)

