from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.devices import router as devices_router
from app.api.metrics import router as metrics_router
from app.api.alerts import router as alerts_router
from app.api.ai import router as ai_router
from app.api.settings import router as settings_router
from app.api.topology import router as topology_router
from app.api.remediation import router as remediation_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(devices_router, prefix="/devices", tags=["devices"])
api_router.include_router(metrics_router, prefix="/metrics", tags=["metrics"])
api_router.include_router(alerts_router, prefix="/alerts", tags=["alerts"])
api_router.include_router(ai_router, prefix="/ai", tags=["ai"])
api_router.include_router(settings_router, prefix="/settings", tags=["settings"])
api_router.include_router(topology_router, prefix="/topology", tags=["topology"])
api_router.include_router(remediation_router, prefix="/remediation", tags=["remediation"])

