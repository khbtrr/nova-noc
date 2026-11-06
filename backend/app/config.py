from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost/nova"
    INFLUXDB_URL: str = "http://localhost:8086"
    INFLUXDB_TOKEN: str = "my-token"
    INFLUXDB_ORG: str = "my-org"
    INFLUXDB_BUCKET: str = "nova"

    JWT_SECRET_KEY: str = "secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    TELEGRAM_ADMIN_IDS: str = ""

    DEFAULT_POLL_INTERVAL: int = 30
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"
    DEFAULT_ADMIN_EMAIL: str = "admin@example.com"

    APP_NAME: str = "NOVA"
    DEBUG: bool = False
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:80,http://127.0.0.1:3000"

    FERNET_SECRET_KEY: str = ""
    SYSLOG_UDP_PORT: int = 5140
    NETFLOW_UDP_PORT: int = 2055
    NETFLOW_ENABLED: bool = True

    WAN_PRIMARY_NAME: str = "ISP JLM"
    WAN_PRIMARY_DESC: str = "Primary Fiber Dedicated"
    WAN_PRIMARY_INTERFACE: str = "sfplus1-JLM"
    WAN_PRIMARY_GATEWAY: str = "119.18.156.153"

    WAN_SECONDARY_NAME: str = "ISP ION"
    WAN_SECONDARY_DESC: str = "Secondary Backup Link"
    WAN_SECONDARY_INTERFACE: str = "ge1-ION"
    WAN_SECONDARY_GATEWAY: str = "210.79.164.65"

    WAN_LAN_TRUNK_INTERFACE: str = "sfplus2-SW"
    WAN_PING_TARGET: str = "8.8.8.8"
    ACCESS_ROOM_KEYWORDS: str = "kepsek,tu,guru,koperasi,wakil,bph,bussines,lab,kelas"

    @property
    def allowed_origins_list(self) -> List[str]:
        origins = [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
        return origins or ["http://localhost:3000"]

    @property
    def room_keywords_list(self) -> List[str]:
        return [k.strip().lower() for k in self.ACCESS_ROOM_KEYWORDS.split(",") if k.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
