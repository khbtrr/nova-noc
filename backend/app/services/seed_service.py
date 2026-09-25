import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.alert_rule import AlertRule
from app.models.device import Device, DeviceType, DeviceStatus
from app.models.alert import Alert, AlertSeverity
from app.services.metrics_service import update_device_snapshot
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("nova.seed")

async def seed_initial_data(db: AsyncSession):
    # 1. Seed default global alert rules
    rules_res = await db.execute(select(AlertRule))
    if not rules_res.scalars().first():
        default_rules = [
            AlertRule(metric_name="cpu_load", condition="gt", warning_threshold=75.0, critical_threshold=90.0, is_enabled=True),
            AlertRule(metric_name="memory_usage", condition="gt", warning_threshold=80.0, critical_threshold=92.0, is_enabled=True),
        ]
        db.add_all(default_rules)
        await db.commit()
        logger.info("Default alert rules seeded.")

    # 2. Do not re-seed mock devices if user removed them
    # Real devices are added by user or discovered via topology scan.
    pass
