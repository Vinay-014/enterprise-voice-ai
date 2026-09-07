import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime
try:
    from app.database import Base
except ImportError:
    from .database import Base

class CallRecord(Base):
    __tablename__ = "call_records"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(String(100), unique=True, index=True, nullable=False)
    candidate_name = Column(String(120), nullable=False)
    phone_number = Column(String(50), nullable=False)
    position = Column(String(120), nullable=False)
    custom_prompt = Column(Text, nullable=True)
    status = Column(String(50), default="Initiated", index=True)  # Initiated, Ringing, Completed, Failed
    duration_seconds = Column(Integer, default=0)
    transcript = Column(Text, nullable=True)
    audio_recording_url = Column(String(500), nullable=True)
    overall_score = Column(Float, default=0.0)
    interest_score = Column(Float, default=0.0)
    answers_summary = Column(Text, nullable=True)
    disposition = Column(String(50), default="Pending") # Interested, Not Interested, Call Back Later, Unreachable, Failed
    lifecycle_status = Column(String(50), default="SCHEDULED", nullable=True) # SCHEDULED, ACTIVE, COMPLETED, FAILED, CANCELLED
    answered_by = Column(String(50), nullable=True) # HUMAN, MACHINE
    retry_reason = Column(String(50), nullable=True) # NOT_CONNECTED, MACHINE_DETECTED
    retries_left = Column(Integer, default=0, nullable=True)
    next_retry_scheduled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(120), nullable=False)
    title = Column(String(120), nullable=False)
    location = Column(String(120), nullable=False)
    contact_phone = Column(String(50), nullable=False)
    email = Column(String(120), nullable=True)
    skills = Column(Text, nullable=False)
    experience_years = Column(Integer, default=1)
    match_percentage = Column(Integer, default=0)
    outreach_status = Column(String(50), default="Not Contacted")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), index=True, nullable=False)
    employee_name = Column(String(120), nullable=False)
    site_code = Column(String(50), index=True, nullable=False)
    site_name = Column(String(150), nullable=False)
    checkin_time = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(50), default="On-Time") # On-Time, Late, Flagged Anomaly
    audio_site_code_verified = Column(Boolean, default=True)
    voiceprint_match = Column(Boolean, default=True)
    voice_transcript = Column(Text, nullable=True)
    anomaly_reason = Column(String(250), nullable=True)
    call_duration_seconds = Column(Integer, default=45)

class SiteLocation(Base):
    __tablename__ = "site_locations"

    id = Column(Integer, primary_key=True, index=True)
    site_code = Column(String(50), unique=True, index=True, nullable=False)
    site_name = Column(String(150), nullable=False)
    region = Column(String(100), nullable=False)
    total_workers = Column(Integer, default=10)
    checked_in_count = Column(Integer, default=0)
    late_count = Column(Integer, default=0)
    anomalies_count = Column(Integer, default=0)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
