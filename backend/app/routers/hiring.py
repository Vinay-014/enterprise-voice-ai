import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

try:
    from app.database import get_db
    from app.models import CallRecord
    from app.schemas import TriggerCallRequest, CallDetailResponse, BackfillResponse
    from app.services.hunar_service import hunar_service
    from app.routers.webhooks import (
        _extract_transcript,
        _extract_summary,
        _resolve_score,
        _resolve_interest_score,
        _resolve_interest,
    )
except ImportError:
    from ..database import get_db
    from ..models import CallRecord
    from ..schemas import TriggerCallRequest, CallDetailResponse, BackfillResponse
    from ..services.hunar_service import hunar_service
    from .webhooks import (
        _extract_transcript,
        _extract_summary,
        _resolve_score,
        _resolve_interest_score,
        _resolve_interest,
    )

router = APIRouter(prefix="/api/v1/hiring", tags=["AI Hiring Assistant"])


def is_placeholder_transcript(transcript: Optional[str]) -> bool:
    """
    Detects if the stored transcript is an empty, temporary, or initial carrier dispatch placeholder.
    """
    if not transcript or not transcript.strip():
        return True
    t = transcript.strip().lower()
    placeholders = [
        "carrier route established",
        "voice screening call dispatched",
        "bulk outreach voice call queued",
        "outreach voice call queued",
        "awaiting live dialogue",
        "awaiting connect",
        "network timeout",
        "[screening call dispatched",
        "[bulk outreach",
        "[pending",
    ]
    return any(p in t for p in placeholders) or t.startswith("[")


def is_placeholder_summary(summary: Optional[str]) -> bool:
    """
    Detects if the stored answers_summary is a static fallback placeholder.
    """
    if not summary or not summary.strip():
        return True
    s = summary.strip().lower()
    placeholders = [
        "initial screening for",
        "call initiated",
        "batch campaign dispatched",
        "outreach campaign dispatched",
        "screening call initiated",
        "awaiting agent evaluation",
        "awaiting candidate connection",
        "awaiting connect",
        "live audio stream processing",
    ]
    return any(p in s for p in placeholders)


def _hydrate_call_record(call: CallRecord, live_data: Dict[str, Any], preserve_duration: bool = True) -> bool:
    """
    Safely hydrates a CallRecord from Hunar live API data:
      - Extracts and updates transcripts (text or turn arrays)
      - Extracts and updates evaluation summaries
      - Extracts and updates overall_score and interest_score
      - Extracts and updates disposition
      - Updates audio_recording_url and lifecycle metadata
      - STRICTLY PRESERVES: call_id, created_at, candidate_name, phone_number, position
      - PRESERVES duration_seconds if already recorded (>0) unless existing is 0
    Returns True if any meaningful field was hydrated.
    """
    if not live_data or not isinstance(live_data, dict):
        return False

    updated = False
    raw_status = str(live_data.get("status", "")).upper()
    if raw_status in ("COMPLETED", "COMPLETE"):
        call.status = "Completed"
        updated = True
    elif raw_status in ("IN_PROGRESS", "ACTIVE"):
        call.status = "In Progress"
        updated = True
    elif raw_status == "RINGING":
        call.status = "Ringing"
        updated = True
    elif raw_status in ("FAILED", "NOT_CONNECTED", "CANCELLED", "ERROR"):
        call.status = "Failed"
        if not call.disposition or call.disposition == "Pending":
            call.disposition = "Failed"
        updated = True

    if live_data.get("lifecycle_status"):
        call.lifecycle_status = live_data["lifecycle_status"]
    if live_data.get("answered_by"):
        call.answered_by = live_data["answered_by"]
    if live_data.get("retry_reason"):
        call.retry_reason = live_data["retry_reason"]
    if live_data.get("retries_left") is not None:
        call.retries_left = int(live_data["retries_left"])

    # Duration preservation rule: retain existing historical duration if non-zero
    new_duration = live_data.get("duration_seconds")
    if new_duration is not None:
        try:
            dur_int = int(new_duration)
            if call.duration_seconds is None or call.duration_seconds == 0:
                call.duration_seconds = dur_int
                updated = True
            elif not preserve_duration and dur_int > 0:
                call.duration_seconds = dur_int
                updated = True
        except (ValueError, TypeError):
            pass

    result_sub = live_data.get("result") if isinstance(live_data.get("result"), dict) else {}

    # Extract transcript across strings and turn arrays
    transcript = _extract_transcript(result_sub, live_data)
    if transcript:
        call.transcript = transcript
        updated = True

    # Extract summary across all known keys
    summary = _extract_summary(result_sub, live_data)
    if summary:
        call.answers_summary = summary
        updated = True

    # Extract scores
    score = _resolve_score(result_sub, live_data)
    if score is not None:
        call.overall_score = score
        updated = True

    interest_score = _resolve_interest_score(result_sub, live_data)
    if interest_score is not None:
        call.interest_score = interest_score
        updated = True

    # Extract disposition
    disposition = _resolve_interest(result_sub.get("interested") or result_sub.get("interest"))
    if disposition:
        call.disposition = disposition
        updated = True
    elif live_data.get("disposition"):
        call.disposition = live_data["disposition"]
        updated = True

    rec_url = live_data.get("recording_url") or live_data.get("audio_url") or live_data.get("audio_recording_url")
    if rec_url:
        call.audio_recording_url = rec_url
        updated = True

    if updated:
        call.updated_at = datetime.datetime.utcnow()

    return updated


from sqlalchemy import func

def seed_default_calls_if_empty(db: Session):
    count = db.query(CallRecord).count()
    if count == 0:
        default_calls = [
            CallRecord(
                call_id="call_hunar_99182a",
                candidate_name="Aarav Patel",
                phone_number="+91-98450-89101",
                position="Senior Distributed Systems Engineer",
                custom_prompt="Screen for high-throughput messaging, Python/FastAPI architecture, and system latency tuning experience.",
                status="Completed",
                duration_seconds=342,
                transcript="Agent: Good morning Aarav, this is the Hunar AI technical screening assistant. Are you ready for a brief conversation regarding the Senior Distributed Systems role?\n\nCandidate: Yes, absolutely. Glad to connect.\n\nAgent: Excellent. Can you highlight your experience designing high-concurrency backend services with FastAPI and message brokers?\n\nCandidate: Over the last 5 years at CloudScale in Bengaluru, I led the rebuild of our telemetry ingestion pipeline from Flask to FastAPI, leveraging async SQLAlchemy and Kafka. We reduced P99 latency by 38% and supported 80k RPS sustained.\n\nAgent: That's very impressive. What is your current availability and target compensation range?\n\nCandidate: I can start within a standard two-week notice period. My target base is in the 45 to 55 LPA range.\n\nAgent: Thank you Aarav. We have captured your responses. Our talent acquisition lead will follow up shortly.",
                audio_recording_url="https://api.voice.hunar.ai/recordings/call_hunar_99182a.mp3",
                overall_score=94.5,
                interest_score=96.0,
                answers_summary="Exemplary domain depth in Kafka, FastAPI concurrency, and latency optimization. Clear communication, within compensation budget, ready in 2 weeks.",
                disposition="Interested",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=2, minutes=15)
            ),
            CallRecord(
                call_id="call_hunar_88127b",
                candidate_name="Elena Weber",
                phone_number="+49-89-555-7319",
                position="Staff Cloud Platform Engineer",
                custom_prompt="Screen for Kubernetes operator development, multi-region failover, and CI/CD pipeline automation.",
                status="Completed",
                duration_seconds=285,
                transcript="Agent: Hello Elena, calling on behalf of the Engineering team for the Staff Cloud Platform role.\n\nCandidate: Hi! Happy to chat about the role.\n\nAgent: Could you briefly describe your hands-on experience managing multi-region Kubernetes clusters?\n\nCandidate: I've maintained multi-region European and global clusters from Munich using GitOps (ArgoCD) and Terraform. Handled cross-region replication for disaster recovery with sub-30 second RTO.\n\nAgent: Great. Are you open to a hybrid work model or strictly remote?\n\nCandidate: I prefer remote, but open to quarterly on-sites in Munich or London.",
                audio_recording_url="https://api.voice.hunar.ai/recordings/call_hunar_88127b.mp3",
                overall_score=89.0,
                interest_score=91.5,
                answers_summary="Solid Kubernetes and multi-region infrastructure experience. Prefers remote/hybrid. Strong cultural fit.",
                disposition="Interested",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=5, minutes=40)
            ),
            CallRecord(
                call_id="call_hunar_77341c",
                candidate_name="Sarah Chen",
                phone_number="+65-6712-4421",
                position="Full-Stack Engineer",
                custom_prompt="Inquire on Next.js 14 App Router, TypeScript state management, and Python backend APIs.",
                status="Completed",
                duration_seconds=184,
                transcript="Agent: Hello Sarah, calling from Hunar AI regarding the Full-Stack Engineer position in our APAC region.\n\nCandidate: Hello! Glad to connect.\n\nAgent: Could you tell us about your experience building responsive TypeScript web applications?\n\nCandidate: I have built full-stack applications with React, TypeScript, and FastAPI for 5+ years in Singapore tech startups.\n\nAgent: Wonderful. Our team will review and get back to you.",
                audio_recording_url="https://api.voice.hunar.ai/recordings/call_hunar_77341c.mp3",
                overall_score=88.0,
                interest_score=90.0,
                answers_summary="Solid full-stack competencies. Responsive communication.",
                disposition="Interested",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=30)
            ),
            CallRecord(
                call_id="call_hunar_66219d",
                candidate_name="Marcus Aurelius Vance",
                phone_number="+41-44-555-0198",
                position="Staff Backend Architect",
                custom_prompt="Evaluate experience architecting event-driven microservices, Python/FastAPI pipelines, and database sharding at scale.",
                status="Completed",
                duration_seconds=448,
                transcript="Agent: Good afternoon Marcus, this is the Hunar AI technical screening assistant. Are you ready for a brief conversation regarding the Staff Backend Architect role?\n\nCandidate: Good afternoon. Yes, I have time and am excited to discuss the role.\n\nAgent: Excellent. Can you walk me through your architectural strategy for scaling event-driven Python microservices handling high transaction volumes?\n\nCandidate: In my previous architecture at InfraLabs in Zurich, we structured our core services around FastAPI with Kafka event streams and PostgreSQL with Citus sharding. We decoupled ingestion from processing workers using async queue workers with backpressure management, allowing us to maintain sub-50ms latency across 120,000 transactions per second during peak loads.\n\nAgent: That demonstrates profound system architecture expertise. What is your preferred working arrangement and compensation expectations?\n\nCandidate: I work best in a hybrid or remote setup with occasional travel to European hubs. My target total compensation is around 210k to 230k CHF base.\n\nAgent: Thank you Marcus. Your technical responses have been recorded and will be shared with our engineering leadership team.",
                audio_recording_url="https://api.voice.hunar.ai/recordings/call_hunar_66219d.mp3",
                overall_score=96.0,
                interest_score=98.0,
                answers_summary="Outstanding technical leadership in distributed systems, Kafka streaming architectures, and high-scale FastAPI backend design. Highly articulate with strong problem-solving clarity.",
                disposition="Interested",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=8, minutes=10)
            ),
            CallRecord(
                call_id="call_hunar_55140e",
                candidate_name="Claire Dubois",
                phone_number="+33-1-4268-0142",
                position="Senior Voice AI & NLP Specialist",
                custom_prompt="Screen for TypeScript/Next.js frontend design systems, Python backend APIs, and end-to-end telemetry observability.",
                status="Completed",
                duration_seconds=210,
                transcript="Agent: Hello Claire, this is Hunar AI calling regarding the Senior Voice AI & NLP Specialist position. Do you have a few minutes to speak?\n\nCandidate: Hi! Yes, perfect timing.\n\nAgent: Great. How do you approach integrating modern Next.js frontend interfaces with FastAPI backend microservices and voice telephony pipelines?\n\nCandidate: I specialize in building type-safe end-to-end architectures using Next.js 14 App Router, WebRTC audio streaming, and OpenAPI/TypeScript contracts against FastAPI endpoints. For telemetry, I implement distributed trace contexts.\n\nAgent: Excellent. What is your current availability to transition into a new position?\n\nCandidate: I am available to join within 3 weeks of an accepted offer.\n\nAgent: Wonderful. Thank you Claire, our hiring team will review your screening summary today.",
                audio_recording_url="https://api.voice.hunar.ai/recordings/call_hunar_55140e.mp3",
                overall_score=92.5,
                interest_score=94.0,
                answers_summary="Strong type-safe full-stack and Voice AI architectural skill across Next.js and FastAPI. 3-week availability.",
                disposition="Interested",
                created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=12, minutes=30)
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
        transcript=f"[Screening call dispatched to {payload.phone_number} via Hunar Voice engine. Awaiting live dialogue stream...]",
        overall_score=0.0,
        interest_score=0.0,
        answers_summary="Screening call initiated. Awaiting agent evaluation.",
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
    if status and status.strip().lower() not in ("all", "*", ""):
        query = query.filter(func.lower(CallRecord.status) == status.strip().lower())
    return query.order_by(CallRecord.created_at.desc()).all()


@router.get("/calls/{call_id}", response_model=CallDetailResponse)
async def get_single_call(call_id: str, db: Session = Depends(get_db)):
    """
    Retrieves a single call record. If the record contains placeholder text or zero scores
    while completed, performs an on-demand lazy sync with Hunar Voice API while preserving
    all original identifiers and historical timestamps.
    """
    call = db.query(CallRecord).filter(CallRecord.call_id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found")

    # On-demand lazy hydration for historical / placeholder records
    if is_placeholder_transcript(call.transcript) or is_placeholder_summary(call.answers_summary) or (call.overall_score == 0.0 and call.status in ("Completed", "In Progress")):
        try:
            live_data = await hunar_service.get_call_status(call_id)
            if live_data and "status" in live_data:
                if _hydrate_call_record(call, live_data, preserve_duration=True):
                    db.commit()
                    db.refresh(call)
        except Exception:
            pass

    return call


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
    Explicitly polls real-time call status from Hunar API and updates database record,
    safely preserving historical timestamps and identifiers.
    """
    call = db.query(CallRecord).filter(CallRecord.call_id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call record not found")

    live_data = await hunar_service.get_call_status(call_id)
    if live_data and "status" in live_data:
        _hydrate_call_record(call, live_data, preserve_duration=True)
        db.commit()
        db.refresh(call)

    return call


@router.post("/calls/backfill", response_model=BackfillResponse)
async def backfill_historical_calls(db: Session = Depends(get_db)):
    """
    Batch migration endpoint that iterates through all stored calls, identifies any
    with missing or placeholder transcripts ("Carrier route established...") or zero scores,
    and queries the Hunar API to hydrate rich dialogue history and evaluation metrics.
    Preserves all immutable historical fields (call_id, created_at, duration).
    """
    calls = db.query(CallRecord).all()
    total_scanned = len(calls)
    hydrated_ids: List[str] = []
    already_hydrated = 0

    for call in calls:
        needs_sync = (
            is_placeholder_transcript(call.transcript)
            or is_placeholder_summary(call.answers_summary)
            or (call.overall_score == 0.0 and call.status in ("Completed", "In Progress"))
        )
        if not needs_sync:
            already_hydrated += 1
            continue

        try:
            live_data = await hunar_service.get_call_status(call.call_id)
            if live_data and "status" in live_data:
                if _hydrate_call_record(call, live_data, preserve_duration=True):
                    hydrated_ids.append(call.call_id)
        except Exception:
            continue

    if hydrated_ids:
        db.commit()

    return BackfillResponse(
        total_scanned=total_scanned,
        total_hydrated=len(hydrated_ids),
        already_hydrated=already_hydrated,
        hydrated_call_ids=hydrated_ids,
        status="Completed"
    )

