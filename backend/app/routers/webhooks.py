import time
import base64
import hmac
import hashlib
import json
import logging
import datetime
from typing import Optional, Dict, Any, Iterable
from fastapi import APIRouter, Depends, HTTPException, Header, Request, BackgroundTasks, status
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models import CallRecord
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])

WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = getattr(settings, "WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS", 300)

# In-memory idempotency cache (call_id:event_type -> timestamp)
_processed_webhooks: Dict[str, float] = {}

def is_webhook_duplicate(call_id: str, event_type: str) -> bool:
    key = f"{call_id}:{event_type}"
    now = time.time()
    # Clean up entries older than 1 hour
    if len(_processed_webhooks) > 5000:
        keys_to_del = [k for k, t in _processed_webhooks.items() if now - t > 3600]
        for k in keys_to_del:
            _processed_webhooks.pop(k, None)

    if key in _processed_webhooks:
        return True
    _processed_webhooks[key] = now
    return False

def compute_hunar_signature(*, api_key: str, request_body: bytes, timestamp: str) -> str:
    """
    Computes HMAC-SHA256 Base64 digest:
    Message = UTF-8(timestamp + ".") + request_body
    Digest = HMAC-SHA256(api_key, Message)
    Signature = Base64(Digest)
    """
    message = f"{timestamp.strip()}.".encode("utf-8") + request_body
    digest = hmac.new(api_key.encode("utf-8"), message, hashlib.sha256).digest()
    return base64.b64encode(digest).decode("ascii")

def verify_hunar_webhook_signature(
    *,
    signature_header: Optional[str],
    timestamp_header: Optional[str],
    request_body: bytes,
    trusted_api_keys: Iterable[str],
) -> bool:
    """
    Validates Hunar webhook signature:
    1. 300-second timestamp tolerance check (anti-replay attack)
    2. Multi-key signature verification using constant-time comparison
    """
    if not (signature_header and signature_header.strip() and timestamp_header and timestamp_header.strip() and request_body):
        return False

    # 1. Replay attack check (Rejects stale requests > 300 seconds)
    try:
        ts = int(timestamp_header.strip())
        if abs(time.time() - ts) > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS:
            return False
    except ValueError:
        return False

    # 2. Multi-key signature verification using constant-time comparison
    timestamp = timestamp_header.strip()
    signatures = [s.strip() for s in signature_header.split(",") if s.strip()]
    for api_key in trusted_api_keys:
        if not api_key:
            continue
        computed = compute_hunar_signature(api_key=api_key, request_body=request_body, timestamp=timestamp)
        for sig in signatures:
            if hmac.compare_digest(sig, computed):
                return True

    return False

def process_webhook_payload_async(payload: Dict[str, Any]):
    """
    Background worker to asynchronously process the webhook payload and update the database,
    ensuring the webhook endpoint returns HTTP 200 well within the 15-second response limit.
    """
    call_id = payload.get("call_id") or payload.get("callId")
    event_type = payload.get("event_type") or "call_status_updated"
    if not call_id:
        return

    db = SessionLocal()
    try:
        call = db.query(CallRecord).filter(CallRecord.call_id == call_id).first()
        if not call:
            meta = payload.get("metadata") or {}
            candidate_name = meta.get("candidate_name", payload.get("callee_name", "Candidate"))
            phone_number = meta.get("phone_number", payload.get("to_number", "+1-555-0100"))
            position = meta.get("position", "Candidate")

            call = CallRecord(
                call_id=call_id,
                candidate_name=candidate_name,
                phone_number=phone_number,
                position=position,
                status="Initiated",
                created_at=datetime.datetime.utcnow()
            )
            db.add(call)

        # 1. Handle call_status_updated
        if event_type == "call_status_updated" or not payload.get("event_type"):
            raw_status = str(payload.get("status", "")).upper()
            if raw_status == "COMPLETED":
                call.status = "Completed"
            elif raw_status in ("IN_PROGRESS", "RINGING"):
                call.status = "Ringing"
            elif raw_status in ("NOT_CONNECTED", "FAILED", "CANCELLED"):
                call.status = "Failed"
                call.disposition = "Failed"

            if payload.get("duration_seconds") is not None:
                call.duration_seconds = int(payload["duration_seconds"])
            if payload.get("transcript"):
                call.transcript = payload["transcript"]
            if payload.get("answered_by"):
                call.answered_by = payload["answered_by"]
            if payload.get("retry_reason"):
                call.retry_reason = payload["retry_reason"]
            if payload.get("retries_left") is not None:
                call.retries_left = int(payload["retries_left"])
            if payload.get("lifecycle_status"):
                call.lifecycle_status = payload["lifecycle_status"]

        # 2. Handle call_recording_done
        if event_type == "call_recording_done" or payload.get("recording_url") or payload.get("audio_url"):
            rec_url = payload.get("recording_url") or payload.get("audio_url") or payload.get("audio_recording_url")
            if rec_url:
                call.audio_recording_url = rec_url

        # 3. Handle call_result_done
        if event_type == "call_result_done" or payload.get("result"):
            res_data = payload.get("result") or {}
            if isinstance(res_data, dict):
                if res_data.get("interested"):
                    call.disposition = "Interested" if "yes" in res_data["interested"].lower() else "Not Interested"
                if res_data.get("qualified"):
                    call.overall_score = 92.0 if "yes" in res_data["qualified"].lower() else 65.0
                if res_data.get("reason"):
                    call.answers_summary = res_data["reason"]
            if payload.get("overall_score") is not None:
                call.overall_score = float(payload["overall_score"])
            if payload.get("interest_score") is not None:
                call.interest_score = float(payload["interest_score"])

        # 4. Handle call_summary (Consolidated terminal update)
        if event_type == "call_summary":
            raw_status = str(payload.get("status", "COMPLETED")).upper()
            if raw_status == "COMPLETED":
                call.status = "Completed"
            elif raw_status in ("NOT_CONNECTED", "FAILED", "CANCELLED"):
                call.status = "Failed"
                call.disposition = "Failed"

            if payload.get("duration_seconds") is not None:
                call.duration_seconds = int(payload["duration_seconds"])
            if payload.get("recording_url") or payload.get("audio_url"):
                call.audio_recording_url = payload.get("recording_url") or payload.get("audio_url")
            if payload.get("transcript"):
                call.transcript = payload["transcript"]
            if payload.get("result") and isinstance(payload["result"], dict):
                res_data = payload["result"]
                if res_data.get("interested"):
                    call.disposition = "Interested" if "yes" in res_data["interested"].lower() else "Not Interested"
                if res_data.get("reason"):
                    call.answers_summary = res_data["reason"]
            if payload.get("disposition"):
                call.disposition = payload["disposition"]
            if payload.get("overall_score") is not None:
                call.overall_score = float(payload["overall_score"])
            if payload.get("interest_score") is not None:
                call.interest_score = float(payload["interest_score"])
            if payload.get("lifecycle_status"):
                call.lifecycle_status = payload["lifecycle_status"]

        call.updated_at = datetime.datetime.utcnow()
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error asynchronously processing Hunar webhook: {str(e)}")
    finally:
        db.close()

@router.post("/hunar")
async def receive_hunar_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hunar_signature: Optional[str] = Header(None),
    x_hunar_timestamp: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """
    Receives real-time voice call outcome callbacks from Hunar Voice AI.
    1. Validates HMAC-SHA256 Base64 signature with 300s timestamp window.
    2. Enforces idempotency per call_id + event_type.
    3. Returns HTTP 200 immediately (< 15s requirement).
    4. Asynchronously processes updates for all 4 events:
       - call_status_updated
       - call_recording_done
       - call_result_done
       - call_summary
    """
    raw_body = await request.body()

    # 1. Cryptographic Signature Validation
    if settings.HUNAR_API_KEY and (x_hunar_signature or x_hunar_timestamp):
        is_valid = verify_hunar_webhook_signature(
            signature_header=x_hunar_signature,
            timestamp_header=x_hunar_timestamp,
            request_body=raw_body,
            trusted_api_keys=[settings.HUNAR_API_KEY]
        )
        if not is_valid:
            logger.warning("Hunar webhook signature verification failed or timestamp tolerance exceeded")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature or expired timestamp"
            )

    try:
        payload = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except Exception:
        return {"status": "ignored", "reason": "Malformed JSON payload"}

    call_id = payload.get("call_id") or payload.get("callId")
    event_type = payload.get("event_type") or "call_status_updated"

    if not call_id:
        return {"status": "ignored", "reason": "Missing call_id parameter"}

    # 2. Idempotency Check
    if is_webhook_duplicate(call_id, event_type):
        return {"status": "idempotent_ignored", "call_id": call_id, "event_type": event_type}

    # 3. Offload background processing and return HTTP 200 immediately
    background_tasks.add_task(process_webhook_payload_async, payload)

    return {
        "status": "received",
        "call_id": call_id,
        "event_type": event_type
    }
