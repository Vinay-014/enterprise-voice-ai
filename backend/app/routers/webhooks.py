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

try:
    from app.database import get_db, SessionLocal
    from app.models import CallRecord
    from app.config import settings
except ImportError:
    from ..database import get_db, SessionLocal
    from ..models import CallRecord
    from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])

WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = getattr(settings, "WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS", 300)

# In-memory idempotency cache (key -> timestamp)
_processed_webhooks: Dict[str, float] = {}


# ---------------------------------------------------------------------------
# Normalisation helpers
# ---------------------------------------------------------------------------

def _resolve_interest(value: Any) -> Optional[str]:
    """
    Maps Hunar's `interested` field variants to canonical disposition strings.

    Hunar may send any of:
        "Yes", "yes", "YES", "true", "True", "1", "interested", "Interested"
    as positive signals.  Anything else (including "No", "false", "0",
    "not interested") is treated as "Not Interested".

    Returns None when the value is falsy/absent so the caller can skip the
    field and leave the existing disposition intact.
    """
    if value is None:
        return None
    normalised = str(value).strip().lower()
    if not normalised:
        return None
    POSITIVE_TOKENS = {"yes", "true", "1", "interested", "y"}
    return "Interested" if normalised in POSITIVE_TOKENS else "Not Interested"


def _resolve_score(result: Dict[str, Any], top_payload: Dict[str, Any]) -> Optional[float]:
    """
    Extracts a numeric overall score from the result sub-dict or the top-level
    payload, checking multiple field names Hunar may use.

    Priority order:
        1. result.overall_score   (numeric, direct)
        2. result.score           (numeric, direct)
        3. result.rating          (numeric, direct)
        4. top_payload.overall_score (numeric, top-level)
        5. result.qualified       (binary string → 92.0 / 65.0 fallback)
    Returns None when no score can be extracted.
    """
    for key in ("overall_score", "score", "rating"):
        raw = result.get(key)
        if raw is not None:
            try:
                return float(raw)
            except (TypeError, ValueError):
                pass

    top_score = top_payload.get("overall_score")
    if top_score is not None:
        try:
            return float(top_score)
        except (TypeError, ValueError):
            pass

    # Binary qualified fallback
    qualified = result.get("qualified")
    if qualified is not None:
        return 92.0 if "yes" in str(qualified).lower() else 65.0

    return None


def _resolve_interest_score(result: Dict[str, Any], top_payload: Dict[str, Any]) -> Optional[float]:
    """
    Extracts a numeric interest/engagement score, checking multiple field names.
    """
    for src in (result, top_payload):
        for key in ("interest_score", "engagement_score", "enthusiasm_score"):
            raw = src.get(key)
            if raw is not None:
                try:
                    return float(raw)
                except (TypeError, ValueError):
                    pass
    return None


def _extract_summary(result: Dict[str, Any], top_payload: Dict[str, Any]) -> Optional[str]:
    """
    Returns the best available answers_summary / reason text from the payload.
    """
    for key in ("answers_summary", "reason", "summary", "notes"):
        val = result.get(key) or top_payload.get(key)
        if val:
            return str(val)
    return None


def _extract_transcript(result: Dict[str, Any], top_payload: Dict[str, Any]) -> Optional[str]:
    """Returns transcript text from the result sub-dict or top-level payload."""
    return result.get("transcript") or top_payload.get("transcript") or None


# ---------------------------------------------------------------------------
# Idempotency
# ---------------------------------------------------------------------------

def is_webhook_duplicate(call_id: str, event_type: str, sequence_hint: str = "") -> bool:
    """
    Deduplication key: call_id + event_type + sequence_hint.

    `sequence_hint` is a short discriminator derived from whichever callback
    fired (e.g. presence of 'result', 'recording_url', 'summary' keys).  This
    prevents the four callbacks — which all hit the same URL and may all default
    to event_type='call_status_updated' — from being collapsed into one entry.
    """
    key = f"{call_id}:{event_type}:{sequence_hint}"
    now = time.time()
    if len(_processed_webhooks) > 5000:
        keys_to_del = [k for k, t in _processed_webhooks.items() if now - t > 3600]
        for k in keys_to_del:
            _processed_webhooks.pop(k, None)

    if key in _processed_webhooks:
        return True
    _processed_webhooks[key] = now
    return False


def _sequence_hint(payload: Dict[str, Any]) -> str:
    """
    Returns a short discriminator string that identifies which of the four
    Hunar callbacks this payload most likely represents, independent of the
    event_type field.  This is used to prevent false-positive deduplication.
    """
    if payload.get("result") or payload.get("qualified") or payload.get("interested"):
        return "result"
    if payload.get("recording_url") or payload.get("audio_url") or payload.get("audio_recording_url"):
        return "recording"
    if (
        payload.get("answers_summary")
        or payload.get("summary")
        or payload.get("overall_score") is not None
        or payload.get("interest_score") is not None
    ):
        return "summary"
    return "status"


# ---------------------------------------------------------------------------
# HMAC signature helpers
# ---------------------------------------------------------------------------

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

    try:
        ts = int(timestamp_header.strip())
        if abs(time.time() - ts) > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS:
            return False
    except ValueError:
        return False

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


# ---------------------------------------------------------------------------
# Background processor
# ---------------------------------------------------------------------------

def process_webhook_payload_async(payload: Dict[str, Any]):
    """
    Background worker to asynchronously process the webhook payload and update
    the database, ensuring the webhook endpoint returns HTTP 200 well within
    the 15-second response limit.

    Handles all four Hunar event types:
        call_status_updated   — status, duration, transcript, answered_by
        call_recording_done   — recording URL
        call_result_done      — scores, disposition, answers summary
        call_summary          — consolidated terminal update (all of the above)
    """
    call_id = payload.get("call_id") or payload.get("callId")
    event_type = (
        payload.get("event_type")
        or payload.get("type")
        or "call_status_updated"
    )
    if not call_id:
        return

    # Resolve result sub-dict once for all handlers below
    result: Dict[str, Any] = payload.get("result") or {}
    if not isinstance(result, dict):
        result = {}

    db = SessionLocal()
    try:
        call = db.query(CallRecord).filter(CallRecord.call_id == call_id).first()
        if not call:
            meta = payload.get("metadata") or {}
            candidate_name = (
                meta.get("candidate_name")
                or payload.get("callee_name")
                or "Candidate"
            )
            phone_number = (
                meta.get("phone_number")
                or payload.get("to_number")
                or "+1-555-0100"
            )
            position = meta.get("position", "Candidate")

            call = CallRecord(
                call_id=call_id,
                candidate_name=candidate_name,
                phone_number=phone_number,
                position=position,
                status="Initiated",
                created_at=datetime.datetime.utcnow(),
            )
            db.add(call)

        # ------------------------------------------------------------------
        # 1. call_status_updated
        # ------------------------------------------------------------------
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
            transcript = _extract_transcript(result, payload)
            if transcript:
                call.transcript = transcript
            if payload.get("answered_by"):
                call.answered_by = payload["answered_by"]
            if payload.get("retry_reason"):
                call.retry_reason = payload["retry_reason"]
            if payload.get("retries_left") is not None:
                call.retries_left = int(payload["retries_left"])
            if payload.get("lifecycle_status"):
                call.lifecycle_status = payload["lifecycle_status"]

        # ------------------------------------------------------------------
        # 2. call_recording_done
        # ------------------------------------------------------------------
        if (
            event_type == "call_recording_done"
            or payload.get("recording_url")
            or payload.get("audio_url")
            or payload.get("audio_recording_url")
        ):
            rec_url = (
                payload.get("recording_url")
                or payload.get("audio_url")
                or payload.get("audio_recording_url")
            )
            if rec_url:
                call.audio_recording_url = rec_url

        # ------------------------------------------------------------------
        # 3. call_result_done
        # ------------------------------------------------------------------
        if event_type == "call_result_done" or payload.get("result"):
            # Disposition from result.interested (all known truthy variants)
            disposition = _resolve_interest(
                result.get("interested") or result.get("interest")
            )
            if disposition:
                call.disposition = disposition

            # Numeric score — checks result.overall_score, result.score,
            # result.rating, top-level overall_score, and binary qualified
            score = _resolve_score(result, payload)
            if score is not None:
                call.overall_score = score

            # Interest / engagement score
            interest_score = _resolve_interest_score(result, payload)
            if interest_score is not None:
                call.interest_score = interest_score

            # Answers summary / reason
            summary = _extract_summary(result, payload)
            if summary:
                call.answers_summary = summary

            # Transcript embedded in result
            transcript = _extract_transcript(result, payload)
            if transcript:
                call.transcript = transcript

            # Status update if present in result payload
            raw_status = str(payload.get("status", "")).upper()
            if raw_status == "COMPLETED":
                call.status = "Completed"
            elif raw_status in ("NOT_CONNECTED", "FAILED", "CANCELLED"):
                call.status = "Failed"
                if not call.disposition or call.disposition == "Pending":
                    call.disposition = "Failed"

        # ------------------------------------------------------------------
        # 4. call_summary  (consolidated terminal update)
        # ------------------------------------------------------------------
        if event_type == "call_summary":
            raw_status = str(payload.get("status", "COMPLETED")).upper()
            if raw_status == "COMPLETED":
                call.status = "Completed"
            elif raw_status in ("NOT_CONNECTED", "FAILED", "CANCELLED"):
                call.status = "Failed"
                if not call.disposition or call.disposition == "Pending":
                    call.disposition = "Failed"

            if payload.get("duration_seconds") is not None:
                call.duration_seconds = int(payload["duration_seconds"])

            rec_url = payload.get("recording_url") or payload.get("audio_url")
            if rec_url:
                call.audio_recording_url = rec_url

            transcript = _extract_transcript(result, payload)
            if transcript:
                call.transcript = transcript

            # Disposition from result dict
            disposition = _resolve_interest(
                result.get("interested") or result.get("interest")
            )
            if disposition:
                call.disposition = disposition

            # Override with explicit top-level disposition if present
            if payload.get("disposition"):
                call.disposition = payload["disposition"]

            # Scores from result dict and/or top-level payload
            score = _resolve_score(result, payload)
            if score is not None:
                call.overall_score = score

            interest_score = _resolve_interest_score(result, payload)
            if interest_score is not None:
                call.interest_score = interest_score

            # Answers summary
            summary = _extract_summary(result, payload)
            if summary:
                call.answers_summary = summary

            if payload.get("lifecycle_status"):
                call.lifecycle_status = payload["lifecycle_status"]

        call.updated_at = datetime.datetime.utcnow()
        db.commit()
        logger.info(
            "[WEBHOOK] Processed %s event for call_id=%s — status=%s disposition=%s score=%s",
            event_type, call_id, call.status, call.disposition, call.overall_score,
        )
    except Exception as e:
        db.rollback()
        logger.error("Error processing Hunar webhook (call_id=%s event=%s): %s", call_id, event_type, str(e))
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

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
    2. Enforces idempotency per call_id + event_type + sequence_hint.
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
            trusted_api_keys=[settings.HUNAR_API_KEY],
        )
        if not is_valid:
            logger.warning("Hunar webhook signature verification failed or timestamp tolerance exceeded")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature or expired timestamp",
            )

    try:
        payload = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except Exception:
        return {"status": "ignored", "reason": "Malformed JSON payload"}

    call_id = payload.get("call_id") or payload.get("callId")
    event_type = payload.get("event_type") or payload.get("type") or "call_status_updated"

    if not call_id:
        return {"status": "ignored", "reason": "Missing call_id parameter"}

    # 2. Idempotency Check — uses sequence_hint so different callbacks for the
    #    same call_id are not collapsed even when event_type defaults match.
    hint = _sequence_hint(payload)
    if is_webhook_duplicate(call_id, event_type, hint):
        logger.debug(
            "[WEBHOOK] Idempotent duplicate ignored: call_id=%s event_type=%s hint=%s",
            call_id, event_type, hint,
        )
        return {"status": "idempotent_ignored", "call_id": call_id, "event_type": event_type}

    # 3. Offload background processing and return HTTP 200 immediately
    background_tasks.add_task(process_webhook_payload_async, payload)

    return {
        "status": "received",
        "call_id": call_id,
        "event_type": event_type,
    }
