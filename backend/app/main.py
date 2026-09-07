import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

try:
    from app.database import engine, Base, SessionLocal
    from app.routers import hiring, reachout, webhooks, attendance
    from app.services.hunar_sync import sync_hunar_calls_to_db
except ImportError:
    from .database import engine, Base, SessionLocal
    from .routers import hiring, reachout, webhooks, attendance
    from .services.hunar_sync import sync_hunar_calls_to_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Step 1: Ensure database schema exists
    Base.metadata.create_all(bind=engine)

    # Step 2: Seed mock records only when DB is completely empty
    db = SessionLocal()
    try:
        hiring.seed_default_calls_if_empty(db)
    except Exception as e:
        logger.warning(f"[STARTUP SEED] {e}")
    finally:
        db.close()

    # Step 3: Sync real call history from Hunar API on every boot.
    # This is the key guard against ephemeral SQLite loss on Render redeploys —
    # real calls are always restored from the Hunar cloud, never lost permanently.
    try:
        synced = await sync_hunar_calls_to_db()
        if synced:
            logger.info(f"[STARTUP SYNC] Restored {synced} real call record(s) from Hunar API.")
    except Exception as e:
        logger.warning(f"[STARTUP SYNC] Hunar sync skipped (non-fatal): {e}")

    yield

app = FastAPI(
    title="Enterprise Voice AI Backend",
    description="Production backend service for AI Hiring screening, People Search & Reachout, and Smartphone-Free Voice Attendance.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(hiring.router)
app.include_router(reachout.router)
app.include_router(webhooks.router)
app.include_router(attendance.router)

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "service": "enterprise-voice-ai-backend",
        "version": "1.0.0"
    }

@app.get("/")
def root():
    return {
        "name": "Enterprise Voice AI Platform API",
        "docs_url": "/docs",
        "endpoints": [
            "/api/v1/hiring/calls",
            "/api/v1/hiring/calls/trigger",
            "/api/v1/search-candidates",
            "/api/v1/trigger-bulk-reachout",
            "/api/v1/reachout/telemetry",
            "/api/v1/webhooks/hunar",
            "/api/v1/attendance/overview",
            "/api/v1/attendance/simulate-ivr"
        ]
    }
