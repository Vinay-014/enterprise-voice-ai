import datetime
import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

try:
    from app.database import get_db
    from app.models import SiteLocation, AttendanceRecord
    from app.schemas import (
        AttendanceCheckinRequest,
        AttendanceRecordResponse,
        AttendanceOverviewResponse,
        SiteLocationItem
    )
except ImportError:
    from ..database import get_db
    from ..models import SiteLocation, AttendanceRecord
    from ..schemas import (
        AttendanceCheckinRequest,
        AttendanceRecordResponse,
        AttendanceOverviewResponse,
        SiteLocationItem
    )

router = APIRouter(prefix="/api/v1/attendance", tags=["Smartphone-Free Attendance System"])

GLOBAL_REGIONS_CONFIG = [
    {"region": "Bengaluru Industrial Corridor (India)", "hub": "Bengaluru Hub", "base_lat": 12.9716, "base_lon": 77.5946},
    {"region": "Singapore Maritime & Logistics (APAC)", "hub": "Jurong Port", "base_lat": 1.3521, "base_lon": 103.8198},
    {"region": "Munich Advanced IoT & Auto Plant (Germany)", "hub": "Bavaria Depot", "base_lat": 48.1351, "base_lon": 11.5820},
    {"region": "London & Midlands Distribution (UK)", "hub": "London Gateway", "base_lat": 51.5074, "base_lon": -0.1278},
    {"region": "Tokyo Precision Robotics Base (Japan)", "hub": "Tokyo Bay", "base_lat": 35.6762, "base_lon": 139.6503},
    {"region": "Hyderabad Biotech & Pharma Park (India)", "hub": "Genome Valley", "base_lat": 17.3850, "base_lon": 78.4867},
    {"region": "Rotterdam Port Automation (Netherlands)", "hub": "Europort", "base_lat": 51.9244, "base_lon": 4.4777},
    {"region": "Taipei Semiconductor Fab Station (Taiwan)", "hub": "Hsinchu Base", "base_lat": 24.8138, "base_lon": 120.9675},
    {"region": "Dubai MENA Logistics Center (UAE)", "hub": "Jebel Ali", "base_lat": 25.2048, "base_lon": 55.2708},
    {"region": "Stockholm Clean Energy Facility (Nordics)", "hub": "Kista Substation", "base_lat": 59.3293, "base_lon": 18.0686},
]

REGIONS = [r["region"] for r in GLOBAL_REGIONS_CONFIG]

def seed_sites_if_empty(db: Session):
    if db.query(SiteLocation).count() == 0:
        sites_data = []
        for i in range(1, 101):
            code = f"SITE-{i:03d}"
            config = GLOBAL_REGIONS_CONFIG[(i - 1) % len(GLOBAL_REGIONS_CONFIG)]
            region = config["region"]
            hub_name = config["hub"]
            name = f"Field Station {i:03d} ({hub_name})"
            total = 10  # 10 workers per site = 1,000 total workers across 100 sites
            checked = random.randint(7, 10)
            late = random.randint(0, 2)
            anom = 1 if (i % 17 == 0) else 0
            
            # Realistic geographic dispersion around regional base coordinates
            lat = round(config["base_lat"] + ((i % 7) - 3) * 0.08, 4)
            lon = round(config["base_lon"] + ((i % 5) - 2) * 0.09, 4)
            
            site = SiteLocation(
                site_code=code,
                site_name=name,
                region=region,
                total_workers=total,
                checked_in_count=checked,
                late_count=late,
                anomalies_count=anom,
                latitude=lat,
                longitude=lon
            )
            sites_data.append(site)
        db.add_all(sites_data)
        db.commit()

        # Seed initial voice check-in audit trails with multinational workforce
        sample_transcripts = [
            ("EMP-1042", "Aarav Patel", "SITE-014", "Field Station 014 (London Gateway)", "On-Time", True, True, "IVR: Welcome to Global Voice Attendance Gateway. Please state your Employee ID. Worker: 1042. IVR: Voice biometric authenticated for Aarav Patel. Confirm your location and shift. Worker: Check-in at Station 014 London Gateway for 07:00 AM Morning Shift. IVR: Audio site beacon tone verified. Check-in recorded on-time. Safe shift.", None),
            ("EMP-2089", "Mei-Ling Chen", "SITE-028", "Field Station 028 (Europort)", "On-Time", True, True, "IVR: State your badge number. Worker: 2089. IVR: Voice biometric verified for Mei-Ling Chen. Audio beacon tone confirmed for Europort Station 028. Confirm duty. Worker: Shift start 07:00 AM at Terminal 3 Container Operations. IVR: Check-in logged successfully.", None),
            ("EMP-3104", "Hans Gruber", "SITE-042", "Field Station 042 (Bavaria Depot)", "Late", True, True, "IVR: State Employee ID. Worker: 3104. IVR: Voiceprint matches Hans Gruber. Inbound timestamp 07:28 AM exceeds 07:00 threshold. State reason. Worker: Autobahn B12 logistics transport delay due to weather. IVR: Logged as Late (Logistics Transport Delay).", "Arrived 28 min past shift start (Transport Delay)"),
            ("EMP-4491", "Liam O'Connor", "SITE-014", "Field Station 014 (London Gateway)", "Flagged Anomaly", True, False, "IVR: State Employee ID. Worker: 4491. IVR: Warning: Landline caller ID originates from Area +44 121 (Birmingham Substation), but verbal check-in claimed Site 014 (London Gateway). IVR: Discrepancy logged for supervisor review.", "Location Telephony Discrepancy (+44-121 Birmingham vs Site 014 London)"),
            ("EMP-5512", "Priya Nair", "SITE-075", "Field Station 075 (Genome Valley)", "On-Time", True, True, "IVR: State Employee ID. Worker: 5512. IVR: Voice biometric verified for Priya Nair. Worker: Logging in at Station 075 Hyderabad Genome Valley for cleanroom manufacturing shift. IVR: Verified. Have a safe shift.", None),
            ("EMP-6238", "Kenji Takahashi", "SITE-056", "Field Station 056 (Genome Valley)", "On-Time", True, True, "IVR: State badge number. Worker: 6238. IVR: Voice biometric verified for Kenji Takahashi. Audio beacon verified for Robotics Assembly Station 056. Worker: Shift start confirmed. IVR: Verified.", None),
        ]

        for emp_id, name, s_code, s_name, status, vp, sc_v, trans, anom_msg in sample_transcripts:
            rec = AttendanceRecord(
                employee_id=emp_id,
                employee_name=name,
                site_code=s_code,
                site_name=s_name,
                status=status,
                audio_site_code_verified=sc_v,
                voiceprint_match=vp,
                voice_transcript=trans,
                anomaly_reason=anom_msg,
                checkin_time=datetime.datetime.utcnow() - datetime.timedelta(minutes=random.randint(15, 180)),
                call_duration_seconds=random.randint(35, 60)
            )
            db.add(rec)
        db.commit()

@router.get("/overview", response_model=AttendanceOverviewResponse)
def get_attendance_overview(db: Session = Depends(get_db)):
    """
    Returns high-level statistics across all 100 remote sites and 1,000 workers.
    """
    seed_sites_if_empty(db)
    sites = db.query(SiteLocation).order_by(SiteLocation.site_code.asc()).all()
    recent = db.query(AttendanceRecord).order_by(AttendanceRecord.checkin_time.desc()).limit(20).all()

    total_workers = sum(s.total_workers for s in sites)
    checked_in = sum(s.checked_in_count for s in sites)
    total_late = sum(s.late_count for s in sites)
    total_anomalies = sum(s.anomalies_count for s in sites)

    site_items = []
    for s in sites:
        rate = round((s.checked_in_count / s.total_workers * 100) if s.total_workers > 0 else 0, 1)
        if s.anomalies_count > 0:
            status = "Critical"
        elif rate < 75.0 or s.late_count >= 2:
            status = "Warning"
        else:
            status = "Optimal"

        site_items.append(
            SiteLocationItem(
                site_code=s.site_code,
                site_name=s.site_name,
                region=s.region,
                total_workers=s.total_workers,
                checked_in_count=s.checked_in_count,
                late_count=s.late_count,
                anomalies_count=s.anomalies_count,
                attendance_rate=rate,
                status=status
            )
        )

    overall_rate = round((checked_in / total_workers * 100) if total_workers > 0 else 0, 1)

    return AttendanceOverviewResponse(
        total_sites=len(sites),
        total_workers=total_workers,
        overall_checked_in=checked_in,
        overall_attendance_rate=overall_rate,
        total_late_alerts=total_late,
        total_anomalies=total_anomalies,
        sites=site_items,
        recent_checkins=recent
    )

@router.post("/simulate-ivr", response_model=AttendanceRecordResponse)
def simulate_ivr_checkin(payload: AttendanceCheckinRequest, db: Session = Depends(get_db)):
    """
    Simulates Tier 1-3 Inbound Landline/Feature Phone IVR interaction with Voice LLM authentication:
    - Prompts Employee ID
    - Verifies audio site code / voiceprint
    - Asks conversational validation questions
    - Evaluates consistency and writes real-time record to SQLite DB
    """
    seed_sites_if_empty(db)

    # Lookup site
    site = db.query(SiteLocation).filter(SiteLocation.site_code == payload.site_code).first()
    site_name = site.site_name if site else f"Site {payload.site_code}"

    # Anomaly checks
    is_code_verified = (payload.audio_site_code == payload.site_code) if payload.audio_site_code else True
    is_voiceprint_matched = True

    # Check for site mismatch in spoken text
    anomaly_notes = None
    status = "On-Time"

    if not is_code_verified:
        status = "Flagged Anomaly"
        anomaly_notes = f"Audio Site DTMF mismatch (Expected: {payload.site_code}, Received: {payload.audio_site_code})"
    elif payload.site_code.lower() not in payload.spoken_location.lower() and "station" not in payload.spoken_location.lower():
        status = "Flagged Anomaly"
        anomaly_notes = f"Location verbal assertion ('{payload.spoken_location}') does not match site record {payload.site_code}"

    transcript = (
        f"IVR Inbound Gateway [Toll-Free 1-800-VOICE-HR]\n"
        f"Caller Audio Stream Active. Remote Site Landline Line #2.\n\n"
        f"Voice LLM: 'Welcome to Enterprise Field Attendance. Please state your 4-digit Employee ID.'\n"
        f"Worker: '{payload.employee_id}'\n"
        f"Voice LLM: 'Employee ID {payload.employee_id} identified. Voice biometric matched. Please confirm site location and shift.'\n"
        f"Worker: '{payload.spoken_location} - Shift: {payload.spoken_shift_time}'\n"
        f"Voice LLM: '{'Verification approved. Check-in recorded on time.' if status == 'On-Time' else 'Warning: Discrepancy logged for site supervisor audit.'}'"
    )

    new_record = AttendanceRecord(
        employee_id=payload.employee_id,
        employee_name=f"Worker #{payload.employee_id}",
        site_code=payload.site_code,
        site_name=site_name,
        status=status,
        audio_site_code_verified=is_code_verified,
        voiceprint_match=is_voiceprint_matched,
        voice_transcript=transcript,
        anomaly_reason=anomaly_notes,
        checkin_time=datetime.datetime.utcnow(),
        call_duration_seconds=48
    )
    db.add(new_record)

    # Update site counter
    if site:
        site.checked_in_count = min(site.total_workers, site.checked_in_count + 1)
        if status == "Late":
            site.late_count += 1
        elif status == "Flagged Anomaly":
            site.anomalies_count += 1

    db.commit()
    db.refresh(new_record)
    return new_record
