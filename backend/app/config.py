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
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    TELEGRAM_ADMIN_IDS: str = ""
    
    DEFAULT_POLL_INTERVAL: int = 30
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"
    DEFAULT_ADMIN_EMAIL: str = "admin@example.com"
    
    APP_NAME: str = "NOVA"
    DEBUG: bool = True
    
    FERNET_SECRET_KEY: str = ""
    SYSLOG_UDP_PORT: int = 514


    class Config:
        env_file = ".env"

settings = Settings()
