import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    HUNAR_API_KEY: str = ""
    HUNAR_BASE_URL: str = "https://api.voice.hunar.ai"
    DATABASE_URL: str = "sqlite:///./app.db"
    APP_ENV: str = "production"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
