from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func, or_, delete
from typing import Optional
from datetime import datetime, timezone, timedelta

from app.models.syslog import SyslogMessage
from app.models.device import Device
from app.schemas.syslog import SyslogResponse, SyslogStatsResponse, PaginatedSyslogResponse
from app.core.dependencies import get_db, get_current_user, require_admin

router = APIRouter()

@router.get("", response_model=PaginatedSyslogResponse)
async def get_syslog_messages(
    device_id: Optional[int] = Query(None),
    severity: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve paginated and filtered Syslog entries."""
    query = (
        select(SyslogMessage, Device.name.label("device_name"))
        .outerjoin(Device, SyslogMessage.device_id == Device.id)
    )

    if device_id:
        query = query.filter(SyslogMessage.device_id == device_id)
    if severity and severity.upper() != "ALL":
        query = query.filter(SyslogMessage.severity == severity.upper())
    if topic:
        query = query.filter(SyslogMessage.topic.ilike(f"%{topic}%"))
    if search:
        search_filter = or_(
            SyslogMessage.message.ilike(f"%{search}%"),
            SyslogMessage.host.ilike(f"%{search}%"),
            SyslogMessage.topic.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)

    # Count total
    count_subq = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_subq)
    total = total_res.scalar() or 0

    # Paginate
    offset = (page - 1) * limit
    paginated_query = query.order_by(desc(SyslogMessage.timestamp)).offset(offset).limit(limit)
    res = await db.execute(paginated_query)
    rows = res.all()

    items = []
    for msg, dev_name in rows:
        items.append(SyslogResponse(
            id=msg.id,
            device_id=msg.device_id,
            device_name=dev_name,
            host=msg.host,
            facility=msg.facility,
            severity=msg.severity,
            topic=msg.topic,
            message=msg.message,
            timestamp=msg.timestamp,
            created_at=msg.created_at
        ))

    pages = max(1, (total + limit - 1) // limit)
    return PaginatedSyslogResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages
    )

@router.get("/stats", response_model=SyslogStatsResponse)
async def get_syslog_stats(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get aggregate count of syslog messages grouped by severity in last 24 hours."""
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    query = (
        select(SyslogMessage.severity, func.count(SyslogMessage.id))
        .filter(SyslogMessage.created_at >= since)
        .group_by(SyslogMessage.severity)
    )
    res = await db.execute(query)
    rows = res.all()

    counts = {r[0].upper(): r[1] for r in rows}
    total = sum(counts.values())

    return SyslogStatsResponse(
        total=total,
        emergency=counts.get("EMERGENCY", 0),
        critical=counts.get("CRITICAL", 0),
        error=counts.get("ERROR", 0),
        warning=counts.get("WARNING", 0),
        notice=counts.get("NOTICE", 0),
        info=counts.get("INFO", 0),
        debug=counts.get("DEBUG", 0)
    )

@router.delete("/clear")
async def clear_syslog_messages(
    db: AsyncSession = Depends(get_db),
    admin = Depends(require_admin)
):
    """Admin-only: clear historical syslog messages."""
    await db.execute(delete(SyslogMessage))
    await db.commit()
    return {"message": "All syslog records successfully cleared."}
