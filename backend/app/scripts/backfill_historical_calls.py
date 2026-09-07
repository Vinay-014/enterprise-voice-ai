"""
Standalone Migration Script: Backfill Historical Call Records
-------------------------------------------------------------
Safely hydrates past screening records from the Hunar Voice API.
Extracts transcripts (text or turn arrays) and agent evaluation summaries,
while strictly preserving immutable historical attributes (call_id, created_at,
existing non-zero duration_seconds, candidate_name, phone_number, position).

Usage:
  python -m backend.app.scripts.backfill_historical_calls
  or
  python backend/app/scripts/backfill_historical_calls.py
"""

import sys
import os
import asyncio
import logging

# Ensure project root is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "../.."))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "../../.."))

for path in (PROJECT_ROOT, BACKEND_DIR, APP_DIR):
    if path not in sys.path:
        sys.path.insert(0, path)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

from app.database import SessionLocal, engine, Base
from app.models import CallRecord
from app.services.hunar_service import hunar_service
from app.routers.hiring import (
    is_placeholder_transcript,
    is_placeholder_summary,
    _hydrate_call_record,
    seed_default_calls_if_empty,
)


async def run_backfill():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_default_calls_if_empty(db)
        calls = db.query(CallRecord).all()
        logger.info(f"Starting historical backfill scan across {len(calls)} records...")

        total_scanned = len(calls)
        hydrated_count = 0
        already_valid_count = 0
        failed_count = 0

        for call in calls:
            needs_hydration = (
                is_placeholder_transcript(call.transcript)
                or is_placeholder_summary(call.answers_summary)
                or (call.overall_score == 0.0 and call.status in ("Completed", "In Progress"))
            )

            if not needs_hydration:
                already_valid_count += 1
                continue

            logger.info(f"Hydrating call_id={call.call_id} (candidate={call.candidate_name})...")
            try:
                live_data = await hunar_service.get_call_status(call.call_id)
                if live_data and "status" in live_data:
                    if _hydrate_call_record(call, live_data, preserve_duration=True):
                        hydrated_count += 1
                        logger.info(
                            f"  -> Hydrated call_id={call.call_id}: status={call.status}, score={call.overall_score}, "
                            f"disposition={call.disposition}, transcript_len={len(call.transcript or '')}"
                        )
                    else:
                        logger.info(f"  -> No new content found for call_id={call.call_id}")
                else:
                    logger.warning(f"  -> Empty or invalid response for call_id={call.call_id}")
                    failed_count += 1
            except Exception as e:
                logger.error(f"  -> Failed to hydrate call_id={call.call_id}: {str(e)}")
                failed_count += 1

        if hydrated_count > 0:
            db.commit()
            logger.info(f"Database successfully updated. Committed {hydrated_count} hydrated records.")
        else:
            logger.info("No records required database commit.")

        logger.info("================ BACKFILL SUMMARY ================")
        logger.info(f"Total Scanned:     {total_scanned}")
        logger.info(f"Hydrated / Fixed:  {hydrated_count}")
        logger.info(f"Already Valid:     {already_valid_count}")
        logger.info(f"Failed / Unreachable: {failed_count}")
        logger.info("==================================================")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(run_backfill())
