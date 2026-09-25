import logging
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup
from app.config import settings

logger = logging.getLogger("nova.telegram")

async def send_telegram_message(message: str) -> bool:
    """Send standard markdown notification to configured Telegram chat."""
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        logger.warning("Telegram bot token or chat ID is not configured")
        return False
    try:
        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        await bot.send_message(chat_id=settings.TELEGRAM_CHAT_ID, text=message, parse_mode="Markdown")
        logger.info(f"Telegram notification sent successfully to {settings.TELEGRAM_CHAT_ID}")
        return True
    except Exception as e:
        logger.error(f"Error sending telegram message: {e}")
        return False

async def send_telegram_remediation_alert(message: str, device_id: int, target: str = "global") -> bool:
    """Send an interactive remediation alert with One-Click approval inline keyboard."""
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        logger.warning("Telegram bot token or chat ID is not configured")
        return False
    try:
        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        keyboard = [
            [
                InlineKeyboardButton("🧹 Flush DNS Cache", callback_data=f"act:flush_dns:{device_id}:global"),
                InlineKeyboardButton("🔍 Uji Diagnostik", callback_data=f"act:diag:{device_id}:global")
            ],
            [
                InlineKeyboardButton("🔄 Restart Interface", callback_data=f"act:restart_iface:{device_id}:{target}"),
                InlineKeyboardButton("✅ Selesaikan / Mute", callback_data=f"act:ack:{device_id}:global")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await bot.send_message(
            chat_id=settings.TELEGRAM_CHAT_ID,
            text=message,
            parse_mode="Markdown",
            reply_markup=reply_markup
        )
        logger.info(f"[NOVA Act] Interactive remediation alert dispatched for device #{device_id}")
        return True
    except Exception as e:
        logger.error(f"[NOVA Act] Failed to send interactive telegram alert: {e}")
        # Fallback to plain message
        return await send_telegram_message(message)
