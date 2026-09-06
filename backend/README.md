# Enterprise Voice AI — Python Backend (Optional Secondary Service)

> **Note:** The primary production service for this platform is the **Node.js/Express server** (`server.ts`) at the repository root. This Python/FastAPI backend is a secondary, optional component for extended AI analysis workflows.

## What This Backend Does

1. Outbound voice screening call dispatch via Hunar Voice API (Python implementation)
2. Webhook outcome ingestion and structured call scoring
3. Candidate extraction from Job Descriptions and bulk voice outreach dispatch
4. Zero-smartphone IVR voice check-in and anomaly detection engine

## Primary Service vs. This Backend

| | Primary Service | This Backend |
|---|---|---|
| **Runtime** | Node.js 22 + Express + tsx | Python 3.11 + FastAPI + uvicorn |
| **Entry Point** | `server.ts` (repo root) | `backend/app/main.py` |
| **Vite Frontend** | ✅ Served directly | ❌ Not included |
| **Render Deploy** | ✅ Configured | Manual setup required |
| **Status** | Production-ready | Development/experimental |

## Quickstart

```bash
# 1. Create and activate virtual environment
cd backend
python -m venv .venv
source .venv/bin/activate       # Linux/macOS
# .venv\Scripts\activate        # Windows PowerShell

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp ../.env.example .env
# Edit .env and set HUNAR_API_KEY, agent IDs, etc.

# 4. Run backend service
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 5. Interactive API documentation
# Open http://localhost:8000/docs
```

## Environment Variables

Same as the root `.env.example`. Key variables:

```env
HUNAR_API_KEY=<your-key>
HUNAR_BASE_URL=https://api.voice.hunar.ai
HUNAR_SCREENING_AGENT_ID=0f870d5a-ba01-4a4a-bc97-611727aa1837
HUNAR_REACHOUT_AGENT_ID=ffc1ebd5-6c44-4864-be80-cbf5e0ae8011
HUNAR_IVR_AGENT_ID=845421cc-5b74-43bc-a9ae-2aaf78b4e403
APP_PUBLIC_URL=https://your-app.onrender.com
```
