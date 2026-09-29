from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, List, Optional
from app.core.dependencies import get_current_user
from app.services.flow.flow_service import (
    get_top_talkers,
    get_top_destinations,
    get_protocols,
    get_conversations,
    get_flow_status
)

router = APIRouter()

@router.get("/top-talkers")
async def fetch_top_talkers(
    window: str = Query("5m", description="Time window: 1m, 5m, 15m, 30m, 1h"),
    limit: int = Query(20, ge=1, le=100),
    current_user = Depends(get_current_user)
):
    """Fetch Top Source IP talkers aggregated within the specified time window."""
    data = get_top_talkers(window=window, limit=limit)
    return {
        "status": "success",
        "window": window,
        "count": len(data),
        "data": data
    }

@router.get("/top-destinations")
async def fetch_top_destinations(
    window: str = Query("5m", description="Time window: 1m, 5m, 15m, 30m, 1h"),
    limit: int = Query(20, ge=1, le=100),
    current_user = Depends(get_current_user)
):
    """Fetch Top Destination IPs aggregated within the specified time window."""
    data = get_top_destinations(window=window, limit=limit)
    return {
        "status": "success",
        "window": window,
        "count": len(data),
        "data": data
    }

@router.get("/protocols")
async def fetch_protocols(
    window: str = Query("5m", description="Time window: 1m, 5m, 15m, 30m, 1h"),
    current_user = Depends(get_current_user)
):
    """Fetch protocol and application service bandwidth distribution."""
    data = get_protocols(window=window)
    return {
        "status": "success",
        "window": window,
        "count": len(data),
        "data": data
    }

@router.get("/conversations")
async def fetch_conversations(
    window: str = Query("5m", description="Time window: 1m, 5m, 15m, 30m, 1h"),
    limit: int = Query(20, ge=1, le=100),
    current_user = Depends(get_current_user)
):
    """Fetch Top active communication conversations (Source -> Destination:Port)."""
    data = get_conversations(window=window, limit=limit)
    return {
        "status": "success",
        "window": window,
        "count": len(data),
        "data": data
    }

@router.get("/status")
async def fetch_flow_status(
    current_user = Depends(get_current_user)
):
    """Fetch NetFlow receiver operational status and throughput metrics."""
    return get_flow_status()
