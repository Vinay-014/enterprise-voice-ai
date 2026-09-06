# Enterprise Voice AI

Supporting:
1. Outbound voice screening calls via Hunar Voice API
2. Webhook outcome ingestion and call scoring
3. Candidate extraction from Job Descriptions and bulk voice outreach dispatch
4. Zero-smartphone IVR voice check-in and anomaly detection engine

## Quickstart

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run backend service
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. Interactive API documentation
Open http://localhost:8000/docs
```
