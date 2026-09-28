from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.config import settings
from app.notifications.telegram import send_telegram_message
from app.core.dependencies import get_current_user, require_admin

router = APIRouter()

class SystemSettings(BaseModel):
    app_name: str
    default_poll_interval: int
    telegram_configured: bool
    gemini_configured: bool
    telegram_chat_id: Optional[str] = None

class TelegramTestRequest(BaseModel):
    chat_id: Optional[str] = None
    message: Optional[str] = "🔔 Test notifikasi sistem NOVA NOC berhasil terkirim!"

@router.get("")
async def get_system_settings(current_user = Depends(get_current_user)):
    return {
        "app_name": settings.APP_NAME,
        "default_poll_interval": settings.DEFAULT_POLL_INTERVAL,
        "telegram_configured": bool(settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID),
        "gemini_configured": bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your-gemini-api-key-here"),
        "telegram_chat_id": settings.TELEGRAM_CHAT_ID or "",
        "debug_mode": settings.DEBUG
    }

@router.post("/test-telegram")
async def test_telegram_notification(
    req: TelegramTestRequest,
    admin = Depends(require_admin)
):
    if not settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=400, detail="TELEGRAM_BOT_TOKEN belum diatur dalam file .env")
    if not settings.TELEGRAM_CHAT_ID:
        raise HTTPException(status_code=400, detail="TELEGRAM_CHAT_ID belum diatur dalam file .env")
        
    success = await send_telegram_message(req.message)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal mengirim pesan Telegram. Pastikan bot sudah di-start di Telegram (kirim /start ke bot) dan Chat ID valid.")
    return {"status": "ok", "message": "Pesan tes telah berhasil dikirimkan ke Telegram!"}

