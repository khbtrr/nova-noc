import asyncio
import logging
from typing import Optional
from telegram import Update
from telegram.ext import Application, CallbackQueryHandler, ContextTypes

from app.config import settings
from app.database import async_session_maker
from app.services.remediation_service import execute_remediation

logger = logging.getLogger("nova.telegram_worker")

_telegram_app: Optional[Application] = None
_bot_task: Optional[asyncio.Task] = None

async def _on_callback_query(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handles mitigation button clicks from Telegram inline keyboard."""
    query = update.callback_query
    if not query or not query.data:
        return

    data = query.data
    logger.info(f"[NOVA Act] Received Telegram callback query: {data}")

    # Expected format: "act:<action_slug>:<device_id>:<target>"
    parts = data.split(":")
    if len(parts) >= 4 and parts[0] == "act":
        act_slug = parts[1]
        try:
            device_id = int(parts[2])
        except ValueError:
            await query.answer(text="Error: ID Perangkat tidak valid.")
            return
        target = parts[3]

        user_name = query.from_user.username or query.from_user.first_name or "NOC-Staff"

        # Acknowledge Telegram UI immediately
        await query.answer(text=f"Mengeksekusi mitigasi ({act_slug}) untuk perangkat #{device_id}...")

        # Action mapping
        action_map = {
            "flush_dns": "FLUSH_DNS",
            "restart_iface": "RESTART_INTERFACE",
            "diag": "RUN_DIAGNOSTICS",
            "ack": "ACKNOWLEDGE"
        }
        action_type = action_map.get(act_slug, "RUN_DIAGNOSTICS")

        # Execute remediation in database session
        async with async_session_maker() as db:
            res = await execute_remediation(
                db=db,
                device_id=device_id,
                action_type=action_type,
                target=target,
                trigger_channel="TELEGRAM",
                executed_by=f"@{user_name}"
            )

        status_icon = "✅" if res.get("success") else "❌"
        append_text = (
            f"\n\n{status_icon} *[Mitigasi Dieksekusi]*\n"
            f"Oleh: @{user_name}\n"
            f"Tindakan: *{action_type}*\n"
            f"Hasil: _{res.get('message', 'Selesai')}_"
        )

        try:
            original_text = query.message.text or query.message.caption or ""
            await query.edit_message_text(
                text=f"{original_text}{append_text}",
                parse_mode="Markdown"
            )
        except Exception as edit_err:
            logger.warning(f"Could not edit telegram message in-place: {edit_err}")

async def start_telegram_worker():
    """Initializes and starts the background Telegram long-polling worker."""
    global _telegram_app
    token = settings.TELEGRAM_BOT_TOKEN
    if not token or token == "your-telegram-bot-token" or len(token) < 10:
        logger.info("[NOVA Act] Telegram Bot Token not set or dummy. Bot worker disabled.")
        return

    try:
        _telegram_app = Application.builder().token(token).build()
        _telegram_app.add_handler(CallbackQueryHandler(_on_callback_query))

        await _telegram_app.initialize()
        await _telegram_app.start()
        if _telegram_app.updater:
            await _telegram_app.updater.start_polling(drop_pending_updates=True)
        logger.info("[NOVA Act] Telegram Interactive Bot Worker started successfully.")
    except Exception as e:
        logger.warning(f"[NOVA Act] Could not start Telegram Bot Worker: {e}")

async def stop_telegram_worker():
    """Stops the Telegram worker cleanly."""
    global _telegram_app
    if _telegram_app:
        try:
            if _telegram_app.updater and _telegram_app.updater.running:
                await _telegram_app.updater.stop()
            if _telegram_app.running:
                await _telegram_app.stop()
            await _telegram_app.shutdown()
            logger.info("[NOVA Act] Telegram Bot Worker stopped.")
        except Exception as e:
            logger.warning(f"Error stopping Telegram Bot Worker: {e}")
        finally:
            _telegram_app = None
