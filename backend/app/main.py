from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

try:
    from app.database import engine, Base
    from app.routers import hiring, reachout, webhooks, attendance
except ImportError:
    from .database import engine, Base
    from .routers import hiring, reachout, webhooks, attendance

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is created on startup
    Base.metadata.create_all(bind=engine)
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
