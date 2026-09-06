import {
  CallRecord,
  TriggerCallPayload,
  CandidateSearchResponse,
  BulkReachoutPayload,
  BulkReachoutResponse,
  TelemetryData,
  AttendanceOverview,
  SimulateIVRPayload,
  AttendanceRecord
} from '../types';

const API_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000');

/**
 * Resilient network client with auto-recovery.
 * Retries network failures (e.g. dev server restarts or backend re-warming)
 * every 3 seconds up to 5 attempts without breaking application state.
 */
async function fetchWithAutoRecovery(
  url: string,
  options?: RequestInit,
  maxRetries = 5,
  retryDelayMs = 3000
): Promise<Response> {
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxRetries) {
    try {
      const res = await fetch(url, options);
      // Auto-recover if server is momentarily returning 502/503/504 during backend reload
      if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < maxRetries - 1) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }
      return res;
    } catch (err: any) {
      lastError = err;
      attempt++;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  throw lastError || new Error(`Network request to ${url} failed after ${maxRetries} attempts`);
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    let errorMessage = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.detail) {
        errorMessage = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
      }
    } catch {
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

export const api = {
  // AI Hiring Assistant
  async triggerCall(payload: TriggerCallPayload): Promise<CallRecord> {
    const res = await fetchWithAutoRecovery(`${API_BASE}/api/v1/hiring/calls/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<CallRecord>(res);
  },

  async getCalls(status?: string): Promise<CallRecord[]> {
    const url = status
      ? `${API_BASE}/api/v1/hiring/calls?status=${encodeURIComponent(status)}`
      : `${API_BASE}/api/v1/hiring/calls`;
    const res = await fetchWithAutoRecovery(url);
    return handleResponse<CallRecord[]>(res);
  },

  async getCall(callId: string): Promise<CallRecord> {
    const res = await fetchWithAutoRecovery(`${API_BASE}/api/v1/hiring/calls/${callId}`);
    return handleResponse<CallRecord>(res);
  },

  async simulateCallFailure(callId: string): Promise<{ status: string; call: CallRecord }> {
    const res = await fetchWithAutoRecovery(`${API_BASE}/api/v1/hiring/calls/${callId}/simulate-failure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse<{ status: string; call: CallRecord }>(res);
  },

  async refreshCallStatus(callId: string): Promise<CallRecord> {
    const res = await fetchWithAutoRecovery(`${API_BASE}/api/v1/hiring/calls/${callId}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse<CallRecord>(res);
  },

  // People Search & Reachout
  async searchCandidates(jobDescription: string): Promise<CandidateSearchResponse> {
    const res = await fetchWithAutoRecovery(`${API_BASE}/api/v1/search-candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_description: jobDescription })
    });
    return handleResponse<CandidateSearchResponse>(res);
  },

  async triggerBulkReachout(payload: BulkReachoutPayload): Promise<BulkReachoutResponse> {
    const res = await fetchWithAutoRecovery(`${API_BASE}/api/v1/trigger-bulk-reachout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<BulkReachoutResponse>(res);
  },

  async getReachoutTelemetry(): Promise<TelemetryData> {
    const res = await fetchWithAutoRecovery(`${API_BASE}/api/v1/reachout/telemetry`);
    return handleResponse<TelemetryData>(res);
  },

  // Webhook Receiver callback simulation / test
  async sendWebhook(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await fetchWithAutoRecovery(`${API_BASE}/api/v1/webhooks/hunar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<Record<string, unknown>>(res);
  },

  // Smartphone-Free Attendance System
  async getAttendanceOverview(): Promise<AttendanceOverview> {
    const res = await fetchWithAutoRecovery(`${API_BASE}/api/v1/attendance/overview`);
    return handleResponse<AttendanceOverview>(res);
  },

  async simulateIVRCheckin(payload: SimulateIVRPayload): Promise<AttendanceRecord> {
    const res = await fetchWithAutoRecovery(`${API_BASE}/api/v1/attendance/simulate-ivr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<AttendanceRecord>(res);
  }
};
