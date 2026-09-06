export interface CallRecord {
  id: number;
  call_id: string;
  candidate_name: string;
  phone_number: string;
  position: string;
  custom_prompt?: string | null;
  status: 'Initiated' | 'Ringing' | 'In Progress' | 'Completed' | 'Failed';
  duration_seconds: number;
  transcript?: string | null;
  audio_recording_url?: string | null;
  overall_score: number;
  interest_score: number;
  answers_summary?: string | null;
  disposition: 'Interested' | 'Not Interested' | 'Call Back Later' | 'Unreachable' | 'Pending';
  created_at: string;
  updated_at?: string | null;
}

export interface TriggerCallPayload {
  candidate_name: string;
  phone_number: string;
  position: string;
  custom_prompt?: string;
}

export interface ExtractedJDMetadata {
  domain: string;
  experience_level: string;
  extracted_skills: string[];
  suggested_locations: string[];
}

export interface CandidateProfile {
  candidate_id: string;
  name: string;
  title: string;
  location: string;
  contact_phone: string;
  email?: string;
  skills: string[];
  experience_years: number;
  match_percentage: number;
  outreach_status: string;
}

export interface CandidateSearchResponse {
  metadata: ExtractedJDMetadata;
  candidates: CandidateProfile[];
  total_matched: number;
}

export interface BulkReachoutPayload {
  candidate_ids: string[];
  position: string;
  job_description?: string;
  custom_prompt?: string;
}

export interface BulkReachoutResponse {
  campaign_id: string;
  total_queued: number;
  queued_candidates: string[];
  status: string;
}

export interface TelemetryData {
  total_calls: number;
  interested_count: number;
  not_interested_count: number;
  callback_later_count: number;
  unreachable_count: number;
  pending_count: number;
  conversion_rate_pct: number;
  average_call_duration_seconds: number;
  campaigns_active: number;
}

export interface SiteLocationItem {
  site_code: string;
  site_name: string;
  region: string;
  total_workers: number;
  checked_in_count: number;
  late_count: number;
  anomalies_count: number;
  attendance_rate: number;
  status: 'Optimal' | 'Warning' | 'Critical';
}

export interface AttendanceRecord {
  id: number;
  employee_id: string;
  employee_name: string;
  site_code: string;
  site_name: string;
  checkin_time: string;
  status: 'On-Time' | 'Late' | 'Flagged Anomaly';
  audio_site_code_verified: boolean;
  voiceprint_match: boolean;
  voice_transcript?: string | null;
  anomaly_reason?: string | null;
  call_duration_seconds: number;
}

export interface AttendanceOverview {
  total_sites: number;
  total_workers: number;
  overall_checked_in: number;
  overall_attendance_rate: number;
  total_late_alerts: number;
  total_anomalies: number;
  sites: SiteLocationItem[];
  recent_checkins: AttendanceRecord[];
}

export interface SimulateIVRPayload {
  employee_id: string;
  site_code: string;
  spoken_location: string;
  spoken_shift_time: string;
  audio_site_code?: string;
}
