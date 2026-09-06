from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Hiring Assistant
class TriggerCallRequest(BaseModel):
    candidate_name: str = Field(..., description="Full name of the candidate")
    phone_number: str = Field(..., description="E.164 phone number, e.g., +15551234567")
    position: str = Field(..., description="Target job title or role")
    custom_prompt: Optional[str] = Field(None, description="Custom voice screening prompt instructions")

class CallDetailResponse(BaseModel):
    id: int
    call_id: str
    candidate_name: str
    phone_number: str
    position: str
    custom_prompt: Optional[str] = None
    status: str  # Initiated, Ringing, Completed, Failed
    duration_seconds: int = 0
    transcript: Optional[str] = None
    audio_recording_url: Optional[str] = None
    overall_score: float = 0.0
    interest_score: float = 0.0
    answers_summary: Optional[str] = None
    disposition: str = "Pending"
    lifecycle_status: Optional[str] = "SCHEDULED"
    answered_by: Optional[str] = None
    retry_reason: Optional[str] = None
    retries_left: Optional[int] = 0
    next_retry_scheduled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Webhook
class WebhookAnswer(BaseModel):
    question: str
    answer: str
    score: Optional[float] = None

class HunarWebhookPayload(BaseModel):
    call_id: str
    event_type: Optional[str] = "call_status_updated"
    status: Optional[str] = None
    agent_id: Optional[str] = None
    request_id: Optional[str] = None
    duration_seconds: Optional[int] = 0
    duration_minutes: Optional[float] = 0.0
    transcript: Optional[str] = None
    audio_url: Optional[str] = None
    recording_url: Optional[str] = None
    overall_score: Optional[float] = 0.0
    interest_score: Optional[float] = 0.0
    answers_summary: Optional[str] = None
    disposition: Optional[str] = "Interested"
    answered_by: Optional[str] = None
    retry_reason: Optional[str] = None
    retries_left: Optional[int] = None
    next_retry_scheduled_at: Optional[str] = None
    lifecycle_status: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

# People Search & Reachout
class JDSearchRequest(BaseModel):
    job_description: str = Field(..., min_length=10, description="Full job description text")

class ExtractedJDMetadata(BaseModel):
    domain: str
    experience_level: str
    extracted_skills: List[str]
    suggested_locations: List[str]

class CandidateProfileItem(BaseModel):
    candidate_id: str
    name: str
    title: str
    location: str
    contact_phone: str
    email: Optional[str] = None
    skills: List[str]
    experience_years: int
    match_percentage: int
    outreach_status: str

class CandidateSearchResponse(BaseModel):
    metadata: ExtractedJDMetadata
    candidates: List[CandidateProfileItem]
    total_matched: int

class BulkReachoutRequest(BaseModel):
    candidate_ids: List[str]
    position: str
    job_description: Optional[str] = None
    custom_prompt: Optional[str] = None

class BulkReachoutResponse(BaseModel):
    campaign_id: str
    total_queued: int
    queued_candidates: List[str]
    status: str

# Attendance Case Study & Dashboard
class AttendanceCheckinRequest(BaseModel):
    employee_id: str
    site_code: str
    spoken_location: str
    spoken_shift_time: str
    audio_site_code: Optional[str] = None

class AttendanceRecordResponse(BaseModel):
    id: int
    employee_id: str
    employee_name: str
    site_code: str
    site_name: str
    checkin_time: datetime
    status: str
    audio_site_code_verified: bool
    voiceprint_match: bool
    voice_transcript: Optional[str] = None
    anomaly_reason: Optional[str] = None
    call_duration_seconds: int

    class Config:
        from_attributes = True

class SiteLocationItem(BaseModel):
    site_code: str
    site_name: str
    region: str
    total_workers: int
    checked_in_count: int
    late_count: int
    anomalies_count: int
    attendance_rate: float
    status: str  # Optimal, Warning, Critical

class AttendanceOverviewResponse(BaseModel):
    total_sites: int
    total_workers: int
    overall_checked_in: int
    overall_attendance_rate: float
    total_late_alerts: int
    total_anomalies: int
    sites: List[SiteLocationItem]
    recent_checkins: List[AttendanceRecordResponse]
