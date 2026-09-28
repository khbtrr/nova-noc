from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.schemas.alert import (
    AlertResponse,
    AlertRuleCreate,
    AlertRuleUpdate,
    AlertRuleResponse,
)
from app.services.alert_service import (
    get_alerts,
    get_alert_history,
    acknowledge_alert,
    get_alert_rules,
    create_alert_rule,
    update_alert_rule,
    delete_alert_rule,
)
from app.core.dependencies import get_db, get_current_user, require_admin

router = APIRouter()

@router.get("", response_model=List[AlertResponse])
async def read_alerts(
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return await get_alerts(db, active_only=active_only)

@router.get("/history", response_model=List[AlertResponse])
async def read_alert_history(
    limit: int = Query(100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return await get_alert_history(db, limit=limit)

@router.put("/{id}/acknowledge", response_model=AlertResponse)
async def ack_alert(id: int, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    return await acknowledge_alert(db, id, user_id=current_user.id)

@router.get("/rules", response_model=List[AlertRuleResponse])
async def read_rules(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return await get_alert_rules(db)

@router.post("/rules", response_model=AlertRuleResponse)
async def add_rule(
    rule_in: AlertRuleCreate,
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin)
):
    return await create_alert_rule(db, rule_in)

@router.put("/rules/{id}", response_model=AlertRuleResponse)
async def edit_rule(
    id: int,
    rule_in: AlertRuleUpdate,
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin)
):
    return await update_alert_rule(db, id, rule_in)

@router.delete("/rules/{id}")
async def remove_rule(
    id: int,
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin)
):
    await delete_alert_rule(db, id)
    return {"detail": "Alert rule deleted"}

