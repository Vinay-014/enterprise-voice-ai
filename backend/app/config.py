import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve directory paths for local dev and production on Render
BACKEND_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_ROOT = BACKEND_DIR.parent

def resolve_database_url() -> str:
    # 1. If explicit non-relative DATABASE_URL is set in environment (e.g., PostgreSQL or custom path)
    env_db = os.getenv("DATABASE_URL")
    if env_db and not env_db.startswith("sqlite:///."):
        return env_db

    # 2. Check for standard Render persistent disk mount locations (/var/data or /data)
    for mount in ("/var/data", "/data"):
        if os.path.isdir(mount) and os.access(mount, os.W_OK):
            return f"sqlite:///{os.path.join(mount, 'app.db')}"

    # 3. Deterministic absolute path to backend/app.db (prevents CWD path drift)
    db_file = BACKEND_DIR / "app.db"
    return f"sqlite:///{db_file.as_posix()}"

class Settings(BaseSettings):
    HUNAR_API_KEY: str = os.getenv("HUNAR_API_KEY", "hunar_va_live_sk_h9Wk6V6Rv6DawsyRHcmiXRW8AeiL27Xark3ntv8oKx6lJUqGdWXvxQ")
    HUNAR_BASE_URL: str = os.getenv("HUNAR_BASE_URL", "https://api.voice.hunar.ai")
    HUNAR_FROM_PHONE_NUMBER: Optional[str] = os.getenv("HUNAR_FROM_PHONE_NUMBER", None)
    
    # Live Active Agent IDs
    HUNAR_SCREENING_AGENT_ID: str = os.getenv("HUNAR_SCREENING_AGENT_ID", "0f870d5a-ba01-4a4a-bc97-611727aa1837")
    HUNAR_REACHOUT_AGENT_ID: str = os.getenv("HUNAR_REACHOUT_AGENT_ID", "ffc1ebd5-6c44-4864-be80-cbf5e0ae8011")
    HUNAR_IVR_AGENT_ID: str = os.getenv("HUNAR_IVR_AGENT_ID", "845421cc-5b74-43bc-a9ae-2aaf78b4e403")
    HUNAR_AGENT_ID: str = os.getenv("HUNAR_AGENT_ID", "0f870d5a-ba01-4a4a-bc97-611727aa1837")

    DATABASE_URL: str = resolve_database_url()
    PORT: int = int(os.getenv("PORT", "3000"))
    APP_ENV: str = os.getenv("APP_ENV", "production")
    APP_PUBLIC_URL: str = os.getenv("APP_PUBLIC_URL", "https://enterprise-voice-ai.onrender.com")
    WEBHOOK_BASE_URL: str = os.getenv(
        "WEBHOOK_BASE_URL",
        os.getenv("RENDER_EXTERNAL_URL", os.getenv("APP_PUBLIC_URL", "https://enterprise-voice-ai.onrender.com"))
    )
    WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS: int = 300

    model_config = SettingsConfigDict(
        env_file=[
            str(WORKSPACE_ROOT / ".env"),
            str(BACKEND_DIR / ".env"),
            ".env"
        ],
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
