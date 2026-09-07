import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

try:
    from app.database import get_db
    from app.models import CallRecord
    from app.schemas import TriggerCallRequest, CallDetailResponse
    from app.services.hunar_service import hunar_service
except ImportError:
    from ..database import get_db
    from ..models import CallRecord
    from ..schemas import TriggerCallRequest, CallDetailResponse
    from ..services.hunar_service import hunar_service

router = APIRouter(prefix="/api/v1/hiring", tags=["AI Hiring Assistant"])

def seed_default_calls_if_empty(db: Session):
    count = db.query(CallRecord).count()
    if count == 0:
        default_calls = [
            CallRecord(
                call_id="call_hunar_99182a",
                candidate_name="Alex Mercer",
                phone_number="+1-415-555-8910",
                position="Senior Distributed Systems Engineer",
                custom_prompt="Screen for high-throughput messaging, Python/FastAPI architecture, and system latency tuning experience.",
                status="Completed",
                duration_seconds=342,
                transcript="Agent: Good morning Alex, this is the Hunar AI technical screening assistant. Are you ready for a brief conversation regarding the Senior Distributed Systems role?\n\nCandidate: Yes, absolutely. Glad to connect.\n\nAgent: Excellent. Can you highlight your experience designing high-concurrency backend services with FastAPI and message brokers?\n\nCandidate: Over the last 5 years at CloudScale, I led the rebuild of our telemetry ingestion pipeline from Flask to FastAPI, leveraging async SQLAlchemy and Kafka. We reduced P99 latency by 38% and supported 80k RPS sustained.\n\nAgent: That's very impressive. What is your current availability and target compensation range?\n\nCandidate: I can start within a standard two-week notice period. My target base is in the $185k to $205k range.\n\nAgent: Thank you Alex. We have captured your responses. Our talent acquisition lead will follow up shortly.",
                audio_recording_url="https://api.voice.hunar.ai/recordings/call_hunar_99182a.mp3",
                overall_score=94.5,
                interest_score=96.0,
                answers_summary="Exemplary domain depth in Kafka, FastAPI concurrency, and latency optimization. Clear communication, within compensation budget, ready in 2 weeks.",
                disposition="Interested",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=2, minutes=15)
            ),
            CallRecord(
                call_id="call_hunar_88127b",
                candidate_name="Danielle Wright",
                phone_number="+1-650-555-7319",
                position="Staff Cloud Platform Engineer",
                custom_prompt="Screen for Kubernetes operator development, multi-region failover, and CI/CD pipeline automation.",
                status="Completed",
                duration_seconds=285,
                transcript="Agent: Hello Danielle, calling on behalf of the Engineering team for the Staff Cloud Platform role.\n\nCandidate: Hi! Happy to chat about the role.\n\nAgent: Could you briefly describe your hands-on experience managing multi-region Kubernetes clusters?\n\nCandidate: I've maintained EKS multi-region clusters using GitOps (ArgoCD) and Terraform. Handled cross-region replication for disaster recovery with sub-30 second RTO.\n\nAgent: Great. Are you open to a hybrid work model or strictly remote?\n\nCandidate: I prefer remote, but open to quarterly on-sites.",
                audio_recording_url="https://api.voice.hunar.ai/recordings/call_hunar_88127b.mp3",
                overall_score=89.0,
                interest_score=91.5,
                answers_summary="Solid Kubernetes and multi-region infrastructure experience. Prefers remote. Strong cultural fit.",
                disposition="Interested",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=5, minutes=40)
            ),
            CallRecord(
                call_id="call_hunar_77341c",
                candidate_name="Jordan Lee",
                phone_number="+1-206-555-4421",
                position="Full-Stack Engineer",
                custom_prompt="Inquire on Next.js 14 App Router, TypeScript state management, and Python backend APIs.",
                status="Completed",
                duration_seconds=184,
                transcript="Agent: Hello Jordan, calling from Hunar AI regarding the Full-Stack Engineer position.\n\nCandidate: Hello! Glad to connect.\n\nAgent: Could you tell us about your experience building responsive TypeScript web applications?\n\nCandidate: I have built full-stack applications with React, TypeScript, and FastAPI for 4+ years.\n\nAgent: Wonderful. Our team will review and get back to you.",
                audio_recording_url="https://api.voice.hunar.ai/recordings/call_hunar_77341c.mp3",
                overall_score=88.0,
                interest_score=90.0,
                answers_summary="Solid full-stack competencies. Responsive communication.",
                disposition="Interested",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=30)
            )
        ]
        for c in default_calls:
            db.add(c)
        db.commit()

@router.post("/calls/trigger", response_model=CallDetailResponse)
async def trigger_screening_call(payload: TriggerCallRequest, db: Session = Depends(get_db)):
    """
    Trigger an outbound voice call to a candidate using the Hunar Voice API.
    """
    if not payload.phone_number or len(payload.phone_number.strip()) < 7:
        raise HTTPException(status_code=400, detail="Invalid phone number format provided.")

    hunar_result = await hunar_service.trigger_outbound_call(
        candidate_name=payload.candidate_name,
        phone_number=payload.phone_number,
        position=payload.position,
        custom_prompt=payload.custom_prompt
    )

    new_record = CallRecord(
        call_id=hunar_result.get("call_id"),
        candidate_name=payload.candidate_name,
        phone_number=payload.phone_number,
        position=payload.position,
        custom_prompt=payload.custom_prompt,
        status=hunar_result.get("status", "Initiated"),
        duration_seconds=0,
        transcript=f"Voice screening call dispatched to {payload.phone_number} via Hunar Voice engine. Status: {hunar_result.get('status', 'Initiated')}.",
        overall_score=0.0,
        interest_score=0.0,
        disposition="Pending",
        created_at=datetime.datetime.utcnow()
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record

@router.get("/calls", response_model=List[CallDetailResponse])
def get_call_history(
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db)
):
    """
    Retrieve list of call records, status, transcripts, and evaluation metrics.
    """
    seed_default_calls_if_empty(db)
    query = db.query(CallRecord)
    if status:
        query = query.filter(CallRecord.status == status)
    return query.order_by(CallRecord.created_at.desc()).all()

@router.get("/phone-numbers")
async def get_phone_numbers():
    """
    Proxy endpoint to retrieve available organization phone numbers from Hunar API.
    """
    return await hunar_service.get_phone_numbers()

@router.get("/calls/{call_id}/refresh", response_model=CallDetailResponse)
@router.post("/calls/{call_id}/refresh", response_model=CallDetailResponse)
async def refresh_single_call(call_id: str, db: Session = Depends(get_db)):
    """
    Polls real-time call status from Hunar API and updates database record.
    """
    call = db.query(CallRecord).filter(CallRecord.call_id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found")

    live_data = await hunar_service.get_call_status(call_id)
    if live_data and "status" in live_data:
        raw_status = str(live_data["status"]).upper()
        if raw_status in ("COMPLETED", "COMPLETE"):
            call.status = "Completed"
        elif raw_status in ("IN_PROGRESS", "ACTIVE"):
            call.status = "In Progress"
        elif raw_status == "RINGING":
            call.status = "Ringing"
        elif raw_status in ("FAILED", "NOT_CONNECTED", "CANCELLED", "ERROR"):
            call.status = "Failed"
            call.disposition = "Failed"

        if live_data.get("lifecycle_status"):
            call.lifecycle_status = live_data["lifecycle_status"]
        if live_data.get("answered_by"):
            call.answered_by = live_data["answered_by"]
        if live_data.get("retry_reason"):
            call.retry_reason = live_data["retry_reason"]
        if live_data.get("retries_left") is not None:
            call.retries_left = int(live_data["retries_left"])
        if live_data.get("duration_seconds"):
            call.duration_seconds = int(live_data["duration_seconds"])
        if live_data.get("transcript"):
            call.transcript = live_data["transcript"]
        if live_data.get("recording_url") or live_data.get("audio_url"):
            call.audio_recording_url = live_data.get("recording_url") or live_data.get("audio_url")
        if live_data.get("disposition"):
            call.disposition = live_data["disposition"]

        call.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(call)

    return call

