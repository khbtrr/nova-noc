from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.core.dependencies import get_db, get_current_user, require_admin
from app.services.remediation_service import (
    execute_remediation,
    get_remediation_logs,
    get_device_remediation_logs
)

router = APIRouter()

class RemediationRequest(BaseModel):
    device_id: int
    action_type: str
    target: Optional[str] = "global"

@router.post("/execute")
async def trigger_remediation(
    req: RemediationRequest,
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin)
):
    """Execute a verified mitigation action on a device (Admin only)."""
    result = await execute_remediation(
        db=db,
        device_id=req.device_id,
        action_type=req.action_type,
        target=req.target or "global",
        trigger_channel="DASHBOARD",
        executed_by=admin.username
    )
    return result

@router.get("/logs")
async def list_remediation_logs(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve global mitigation audit logs."""
    return await get_remediation_logs(db=db, limit=limit)

@router.get("/logs/{device_id}")
async def list_device_remediation_logs(
    device_id: int,
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve mitigation audit logs for a specific device."""
    return await get_device_remediation_logs(db=db, device_id=device_id, limit=limit)

