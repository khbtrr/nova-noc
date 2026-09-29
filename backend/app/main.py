import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import settings
from app.database import engine, Base, async_session_maker
from app.services.auth_service import create_default_admin
from app.services.seed_service import seed_initial_data
from app.collectors.scheduler import start_scheduler, stop_scheduler
from app.notifications.websocket import manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nova.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        from sqlalchemy import text
        await conn.execute(text("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE;"))
        await conn.execute(text("ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_snoozed BOOLEAN DEFAULT FALSE;"))
        await conn.execute(text("ALTER TABLE devices ADD COLUMN IF NOT EXISTS snooze_until TIMESTAMP WITH TIME ZONE;"))
        await conn.execute(text("ALTER TABLE devices ADD COLUMN IF NOT EXISTS snooze_reason VARCHAR;"))
        
    async with async_session_maker() as db:
        await create_default_admin(db)
        await seed_initial_data(db)
        
        # Auto-migrate any unencrypted device credentials with Fernet
        try:
            from sqlalchemy.future import select
            from app.models.device import Device
            from app.core.crypto import is_encrypted, encrypt_credential
            dev_res = await db.execute(select(Device))
            devices = dev_res.scalars().all()
            migrated_count = 0
            for dev in devices:
                updated = False
                if dev.password and not is_encrypted(dev.password):
                    dev.password = encrypt_credential(dev.password)
                    updated = True
                if dev.snmp_community and not is_encrypted(dev.snmp_community):
                    dev.snmp_community = encrypt_credential(dev.snmp_community)
                    updated = True
                if updated:
                    migrated_count += 1
            if migrated_count > 0:
                await db.commit()
                logger.info(f"Fernet: Migrated credentials for {migrated_count} devices to encrypted storage.")
        except Exception as mig_err:
            logger.warning(f"Credential migration skipped: {mig_err}")

    try:
        await start_scheduler()
    except Exception as e:
        logger.warning(f"Scheduler could not start: {e}")

    try:
        from app.services.syslog_service import start_syslog_server, stop_syslog_server, cleanup_old_syslogs
        await start_syslog_server()
        # Clean up expired logs older than 7 days
        await cleanup_old_syslogs(retention_days=7)
    except Exception as e:
        logger.warning(f"Syslog receiver could not start: {e}")

    try:
        from app.notifications.telegram_worker import start_telegram_worker, stop_telegram_worker
        await start_telegram_worker()
    except Exception as e:
        logger.warning(f"Telegram worker could not start: {e}")
    
    yield
    
    try:
        from app.services.syslog_service import stop_syslog_server
        stop_syslog_server()
    except Exception as e:
        logger.warning(f"Error stopping Syslog server: {e}")

    try:
        from app.notifications.telegram_worker import stop_telegram_worker
        await stop_telegram_worker()
    except Exception as e:
        logger.warning(f"Error stopping Telegram worker: {e}")

    try:
        stop_scheduler()
    except Exception as e:
        logger.warning(f"Error stopping scheduler: {e}")

app = FastAPI(
    title="NOVA: Network Operations & Vision Analytics",
    description="Sistem Network Operations Center untuk monitoring dan telemetri jaringan real-time",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "1.0.0"
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Missing authentication token")
        return
    
    from app.core.security import decode_access_token
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        await websocket.close(code=1008, reason="Invalid or expired token")
        return

    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

