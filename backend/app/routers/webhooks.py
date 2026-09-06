import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

from app.database import get_db
from app.models import CallRecord
from app.schemas import HunarWebhookPayload

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])

@router.post("/hunar")
async def receive_hunar_webhook(
    payload: HunarWebhookPayload,
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Receives real-time voice call outcome callbacks from Hunar Voice AI.
    Safely updates DB record for call_id with duration, answers summary,
    audio transcript, and candidate interest score.
    """
    logger.info(f"Received Hunar webhook for call_id={payload.call_id} status={payload.status}")

    try:
        call = db.query(CallRecord).filter(CallRecord.call_id == payload.call_id).first()
        if not call:
            # Create record if not found
            candidate_name = "Candidate"
            phone_number = "+1-555-0100"
            position = "Software Engineer"
            if payload.metadata:
                candidate_name = payload.metadata.get("candidate_name", candidate_name)
                phone_number = payload.metadata.get("phone_number", phone_number)
                position = payload.metadata.get("position", position)

            call = CallRecord(
                call_id=payload.call_id,
                candidate_name=candidate_name,
                phone_number=phone_number,
                position=position,
                status=payload.status or "Completed",
                created_at=datetime.datetime.utcnow()
            )
            db.add(call)

        # Update call record fields safely
        if payload.status:
            call.status = payload.status
        if payload.duration_seconds is not None and payload.duration_seconds > 0:
            call.duration_seconds = payload.duration_seconds

        if payload.transcript:
            call.transcript = payload.transcript

        if payload.audio_url:
            call.audio_recording_url = payload.audio_url

        if payload.overall_score is not None:
            call.overall_score = payload.overall_score

        if payload.interest_score is not None:
            call.interest_score = payload.interest_score

        if payload.answers_summary:
            call.answers_summary = payload.answers_summary

        if payload.disposition:
            call.disposition = payload.disposition

        call.updated_at = datetime.datetime.utcnow()

        db.commit()
        db.refresh(call)

        return {
            "status": "success",
            "call_id": call.call_id,
            "updated_status": call.status,
            "overall_score": call.overall_score,
            "interest_score": call.interest_score
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error defensively processing Hunar webhook: {str(e)}")
        return {
            "status": "handled_error",
            "call_id": payload.call_id,
            "detail": str(e)
        }
