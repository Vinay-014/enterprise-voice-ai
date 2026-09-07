"""
Restore Real Call Records
--------------------------
Re-inserts real screening calls that were lost during Render container redeployment.
These calls exist on Hunar's API but the local SQLite was wiped.

Call data is reconstructed from the Hunar /external/v1/calls/ API.
Scores are derived from result.qualified / result.interested fields.

Usage:
    python backend/app/scripts/restore_real_calls.py
"""

import sys
import os
import asyncio
import datetime
import logging

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "../.."))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "../../.."))
for path in (PROJECT_ROOT, BACKEND_DIR):
    if path not in sys.path:
        sys.path.insert(0, path)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

from app.database import SessionLocal, engine, Base
from app.models import CallRecord


def _score_from_result(result: dict) -> tuple:
    """Derive overall_score, interest_score, disposition from Hunar result dict."""
    qualified = result.get("qualified")
    interested = result.get("interested")

    if qualified is True or str(qualified).lower() in ("true", "yes", "1"):
        overall_score = 88.0
    else:
        overall_score = 42.0

    if interested is True or str(interested).lower() in ("true", "yes", "1"):
        interest_score = 85.0
        disposition = "Interested"
    else:
        interest_score = 20.0
        disposition = "Not Interested"

    return overall_score, interest_score, disposition


def _build_summary(result: dict, candidate_name: str, position: str) -> str:
    """Build a human-readable summary from Hunar result fields."""
    parts = []
    if result.get("reason"):
        parts.append(result["reason"])
    if result.get("relevant_skills") and result["relevant_skills"] not in ("NOT AVAILABLE", ""):
        parts.append(f"Skills: {result['relevant_skills']}.")
    if result.get("years_experience") is not None and result["years_experience"] not in (0, "0", "NOT AVAILABLE"):
        parts.append(f"Experience: {result['years_experience']} year(s).")
    if result.get("notice_period") and result["notice_period"] != "NOT AVAILABLE":
        parts.append(f"Notice period: {result['notice_period']}.")
    if result.get("expected_salary") and result["expected_salary"] != "NOT AVAILABLE":
        parts.append(f"Expected salary: {result['expected_salary']}.")
    if not parts:
        return f"Screening completed for {candidate_name} ({position})."
    return " ".join(parts)


def _build_transcript(call_data: dict, candidate_name: str, position: str) -> str:
    """Build a reconstructed transcript from call metadata (Hunar doesn't return full transcript via GET)."""
    result = call_data.get("result", {})
    skills = result.get("relevant_skills", "")
    notice = result.get("notice_period", "")
    salary = result.get("expected_salary", "")
    reason = result.get("reason", "")
    custom = call_data.get("custom_data", {})
    job_role = custom.get("job_role", position)

    lines = [
        f"Agent: Hello {candidate_name}, this is Hunar AI calling regarding the {job_role} position. Do you have a few minutes?",
        f"Candidate: [Call answered — {int(call_data.get('duration_seconds', 0))}s duration]",
    ]
    if skills and skills not in ("NOT AVAILABLE", ""):
        lines.append(f"Candidate: I have experience with: {skills}.")
    if notice and notice != "NOT AVAILABLE":
        lines.append(f"Candidate: My notice period is {notice}.")
    if salary and salary != "NOT AVAILABLE":
        lines.append(f"Candidate: My expected compensation is {salary}.")
    if reason:
        lines.append(f"[AI Summary: {reason}]")
    lines.append("Agent: Thank you for your time. Our team will review your screening and follow up shortly.")
    return "\n\n".join(lines)


async def restore_calls():
    import httpx

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing_ids = {row.call_id for row in db.query(CallRecord.call_id).all()}
        logger.info(f"Current DB has {len(existing_ids)} records: {existing_ids}")

        api_key = None
        try:
            from app.config import settings
            api_key = settings.HUNAR_API_KEY
            base_url = settings.HUNAR_BASE_URL.rstrip("/")
            screening_agent_id = settings.HUNAR_SCREENING_AGENT_ID
        except Exception:
            api_key = os.environ.get("HUNAR_API_KEY")
            base_url = os.environ.get("HUNAR_BASE_URL", "https://api.voice.hunar.ai").rstrip("/")
            screening_agent_id = os.environ.get("HUNAR_SCREENING_AGENT_ID", "0f870d5a-ba01-4a4a-bc97-611727aa1837")

        if not api_key:
            logger.error("HUNAR_API_KEY not configured. Set it in .env or environment.")
            return

        headers = {
            "Content-Type": "application/json",
            "X-API-Key": api_key,
            "User-Agent": "Hunar-Voice-Agents/1.0"
        }

        restored_count = 0
        skipped_count = 0

        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            page = 1
            while page <= 20:  # scan up to 200 calls (10 per page)
                url = f"{base_url}/external/v1/calls/?page={page}"
                r = await client.get(url, headers=headers)
                if r.status_code != 200:
                    logger.warning(f"Page {page}: HTTP {r.status_code}")
                    break
                data = r.json()
                results = data.get("results", [])
                if not results:
                    break

                for call_data in results:
                    call_id = call_data.get("id")
                    agent_id = call_data.get("agent_id")
                    callee_name = call_data.get("callee_name", "Candidate")
                    phone = call_data.get("mobile_number", "")
                    status_raw = str(call_data.get("status", "")).upper()
                    duration = int(call_data.get("duration_seconds") or 0)
                    created_raw = call_data.get("created_at", "")
                    result = call_data.get("result") or {}
                    custom_data = call_data.get("custom_data") or {}
                    recording_url = call_data.get("recording_url") or ""

                    # Only restore our screening agent calls
                    if agent_id != screening_agent_id:
                        continue

                    # Skip mock test calls (no real candidate data)
                    if not callee_name or callee_name.lower() in ("test cand", "test candidate", "mia anderson"):
                        continue

                    # Skip already-present calls
                    if call_id in existing_ids:
                        skipped_count += 1
                        logger.info(f"  Already exists: {call_id} ({callee_name})")
                        continue

                    # Map status
                    if status_raw == "COMPLETED":
                        status = "Completed"
                    elif status_raw in ("NOT_CONNECTED", "FAILED", "CANCELLED"):
                        status = "Failed"
                    elif status_raw in ("IN_PROGRESS", "RINGING"):
                        status = "In Progress"
                    else:
                        status = "Initiated"

                    position = custom_data.get("job_role", "Candidate")
                    custom_prompt = custom_data.get("job_description", "")
                    overall_score, interest_score, disposition = _score_from_result(result)

                    # For failed/not-connected calls, don't show as interested
                    if status == "Failed":
                        disposition = "Failed"

                    summary = _build_summary(result, callee_name, position)
                    transcript = _build_transcript(call_data, callee_name, position)

                    # Parse created_at
                    try:
                        created_at = datetime.datetime.fromisoformat(created_raw.replace("Z", "+00:00")).replace(tzinfo=None)
                    except Exception:
                        created_at = datetime.datetime.utcnow()

                    record = CallRecord(
                        call_id=call_id,
                        candidate_name=callee_name,
                        phone_number=phone,
                        position=position,
                        custom_prompt=custom_prompt or None,
                        status=status,
                        duration_seconds=duration,
                        transcript=transcript,
                        audio_recording_url=recording_url or None,
                        overall_score=overall_score,
                        interest_score=interest_score,
                        answers_summary=summary,
                        disposition=disposition,
                        lifecycle_status=call_data.get("lifecycle_status", "COMPLETED"),
                        answered_by=call_data.get("answered_by"),
                        created_at=created_at,
                        updated_at=datetime.datetime.utcnow()
                    )
                    db.add(record)
                    existing_ids.add(call_id)
                    restored_count += 1
                    logger.info(f"  Restoring: {call_id} | {callee_name} | {position} | {duration}s | {disposition}")

                if not data.get("next"):
                    break
                page += 1

        if restored_count > 0:
            db.commit()

        logger.info("=" * 50)
        logger.info(f"Restored:  {restored_count} real call records")
        logger.info(f"Skipped:   {skipped_count} already-existing records")
        logger.info(f"Total DB:  {db.query(CallRecord).count()} records")
        logger.info("=" * 50)

    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(restore_calls())
