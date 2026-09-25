import asyncio
import json
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.future import select
from app.database import async_session_maker
from app.models.device import Device, DeviceType, DeviceStatus
from app.collectors.mikrotik_collector import MikrotikCollector
from app.collectors.snmp_collector import SNMPCollector
from app.services.alert_service import evaluate_metrics
from app.notifications.websocket import manager

logger = logging.getLogger("nova.scheduler")
scheduler = AsyncIOScheduler()

async def poll_device(device_id: int):
    async with async_session_maker() as db:
        result = await db.execute(select(Device).filter(Device.id == device_id))
        device = result.scalar_one_or_none()
        
        if not device or not device.is_enabled:
            return
            
        collector = None
        if device.device_type == DeviceType.MIKROTIK:
            collector = MikrotikCollector()
        elif device.device_type == DeviceType.SNMP:
            collector = SNMPCollector()
            
        if collector:
            try:
                metrics = await collector.collect(device)
                now = datetime.now(timezone.utc)
                if metrics:
                    device.status = DeviceStatus.ONLINE
                    device.last_seen = now
                    # Evaluate alerts
                    await evaluate_metrics(db, device.id, metrics)
                    # Broadcast real-time metrics update via WebSocket
                    ws_payload = json.dumps({
                        "event": "metrics_update",
                        "data": {
                            "device_id": device.id,
                            "device_name": device.name,
                            "host": device.host,
                            "status": device.status.value,
                            "last_seen": now.isoformat(),
                            "metrics": metrics
                        }
                    })
                    await manager.broadcast(ws_payload)
                else:
                    # Failed collection
                    device.status = DeviceStatus.WARNING
                    ws_payload = json.dumps({
                        "event": "device_status",
                        "data": {
                            "device_id": device.id,
                            "status": device.status.value
                        }
                    })
                    await manager.broadcast(ws_payload)
                await db.commit()
            except Exception as e:
                logger.error(f"Error polling device {device.id}: {e}")

async def update_device_job(device_id: int, interval: int = 30):
    job_id = f"poll_device_{device_id}"
    scheduler.add_job(
        poll_device,
        'interval',
        seconds=max(interval, 5),
        args=[device_id],
        id=job_id,
        replace_existing=True
    )

def remove_device_job(device_id: int):
    job_id = f"poll_device_{device_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)

async def start_scheduler():
    async with async_session_maker() as db:
        result = await db.execute(select(Device).filter(Device.is_enabled == True))
        devices = result.scalars().all()
        
        for device in devices:
            await update_device_job(device.id, device.poll_interval or 30)
            
    if not scheduler.running:
        scheduler.start()
        logger.info("NOVA Polling Scheduler started.")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("NOVA Polling Scheduler stopped.")
