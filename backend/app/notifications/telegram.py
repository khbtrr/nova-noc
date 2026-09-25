import logging
from telegram import Bot
from app.config import settings

logger = logging.getLogger("nova.telegram")

async def send_telegram_message(message: str) -> bool:
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        logger.warning("Telegram bot token or chat ID is not configured")
        return False
    try:
        bot = Bot(token=settings.TELEGRAM_BOT_TOKEN)
        await bot.send_message(chat_id=settings.TELEGRAM_CHAT_ID, text=message)
        logger.info(f"Telegram notification sent successfully to {settings.TELEGRAM_CHAT_ID}")
        return True
    except Exception as e:
        logger.error(f"Error sending telegram message: {e}")
        return False
