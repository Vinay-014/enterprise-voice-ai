import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    HUNAR_API_KEY: str = ""
    HUNAR_BASE_URL: str = "https://api.hunar.ai"
    HUNAR_FROM_PHONE_NUMBER: str = "+14155550100"
    HUNAR_AGENT_ID: str = "8bbc73ee-01f7-4d30-96fb-3d4af2f07121"
    DATABASE_URL: str = "sqlite:///./app.db"
    APP_ENV: str = "production"
    APP_PUBLIC_URL: str = "https://api.hunar.ai"
    WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS: int = 300

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
