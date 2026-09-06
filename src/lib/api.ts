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
 * Resilient query fetcher with AbortController timeout and fast failover.
 * Used for read and polling operations to prevent stacking requests during network changes.
 */
async function fetchQuery(
  url: string,
  options?: RequestInit,
  timeoutMs = 6000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Resilient mutation fetcher with exponential backoff and timeout.
 * Used for critical state transitions (triggering calls, search, bulk outreach, check-ins).
 */
async function fetchMutation(
  url: string,
  options?: RequestInit,
  maxRetries = 3,
  timeoutMs = 12000
): Promise<Response> {
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < maxRetries - 1) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 600));
        continue;
      }
      return res;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      attempt++;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 600));
      }
    }
  }

  throw lastError || new Error(`Request to ${url} failed after ${maxRetries} attempts`);
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
    const res = await fetchMutation(`${API_BASE}/api/v1/hiring/calls/trigger`, {
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
    const res = await fetchQuery(url);
    return handleResponse<CallRecord[]>(res);
  },

  async getCall(callId: string): Promise<CallRecord> {
    const res = await fetchQuery(`${API_BASE}/api/v1/hiring/calls/${callId}`);
    return handleResponse<CallRecord>(res);
  },

  async simulateCallFailure(callId: string): Promise<{ status: string; call: CallRecord }> {
    const res = await fetchMutation(`${API_BASE}/api/v1/hiring/calls/${callId}/simulate-failure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse<{ status: string; call: CallRecord }>(res);
  },

  async refreshCallStatus(callId: string): Promise<CallRecord> {
    const res = await fetchMutation(`${API_BASE}/api/v1/hiring/calls/${callId}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse<CallRecord>(res);
  },

  // People Search & Reachout
  async searchCandidates(jobDescription: string): Promise<CandidateSearchResponse> {
    const res = await fetchMutation(`${API_BASE}/api/v1/search-candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_description: jobDescription })
    });
    return handleResponse<CandidateSearchResponse>(res);
  },

  async triggerBulkReachout(payload: BulkReachoutPayload): Promise<BulkReachoutResponse> {
    const res = await fetchMutation(`${API_BASE}/api/v1/trigger-bulk-reachout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<BulkReachoutResponse>(res);
  },

  async getReachoutTelemetry(): Promise<TelemetryData> {
    const res = await fetchQuery(`${API_BASE}/api/v1/reachout/telemetry`);
    return handleResponse<TelemetryData>(res);
  },

  // Webhook Receiver callback simulation / test
  async sendWebhook(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await fetchMutation(`${API_BASE}/api/v1/webhooks/hunar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<Record<string, unknown>>(res);
  },

  // Smartphone-Free Attendance System
  async getAttendanceOverview(): Promise<AttendanceOverview> {
    const res = await fetchQuery(`${API_BASE}/api/v1/attendance/overview`);
    return handleResponse<AttendanceOverview>(res);
  },

  async simulateIVRCheckin(payload: SimulateIVRPayload): Promise<AttendanceRecord> {
    const res = await fetchMutation(`${API_BASE}/api/v1/attendance/simulate-ivr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<AttendanceRecord>(res);
  }
};
