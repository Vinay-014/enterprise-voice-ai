"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AttendanceOverview, AttendanceRecord } from '@/types';
import {
  Phone,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  Search,
  FileCheck,
  Mic,
  Activity,
  Check,
  RefreshCw,
  X
} from 'lucide-react';

export const AttendanceSystem: React.FC = () => {
  const [overview, setOverview] = useState<AttendanceOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'architecture' | 'simulator'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState<'all' | 'Optimal' | 'Warning' | 'Critical'>('all');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  const [simEmployeeId, setSimEmployeeId] = useState('1042');
  const [simSiteCode, setSimSiteCode] = useState('SITE-014');
  const [simLocationSpoken, setSimLocationSpoken] = useState('Field Station 014 - London Gateway Distribution Hub');
  const [simShiftTime, setSimShiftTime] = useState('07:00 AM Morning Shift');
  const [simBeaconMatch, setSimBeaconMatch] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<AttendanceRecord | null>(null);

  const fetchOverview = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAttendanceOverview();
      setOverview(data);
    } catch (err) {
      console.error('Failed to load attendance overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleRunSimulator = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setSimulationResult(null);

    try {
      const record = await api.simulateIVRCheckin({
        employee_id: simEmployeeId,
        site_code: simSiteCode,
        spoken_location: simLocationSpoken,
        spoken_shift_time: simShiftTime,
        audio_site_code: simBeaconMatch ? simSiteCode : 'SITE-MISMATCH-999'
      });
      setSimulationResult(record);
      await fetchOverview();
    } catch (err: any) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredSites = (overview?.sites || []).filter((s) => {
    const matchesSearch =
      s.site_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.site_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.region.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = siteFilter === 'all' ? true : s.status === siteFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-900 text-white">
              Enterprise Case Study
            </span>
            <span className="text-xs text-zinc-500 font-medium">1,000 Workers • 100 Remote Sites • Zero Smartphones</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Smartphone-Free Voice Attendance & Command Platform
          </h2>
          <p className="text-sm text-zinc-500 mt-1 max-w-3xl">
            Fully conversational inbound telephony system designed for rugged remote facilities. Workers authenticate via landline or basic 2G feature phones using biometric voiceprints and audio beacons.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl border border-zinc-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'dashboard'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            HR Command Dashboard
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'architecture'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Solution Architecture
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'simulator'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Live IVR Simulator
          </button>
        </div>
      </div>

      {activeTab === 'architecture' && (
        <div className="space-y-8">
          <div className="bg-zinc-900 text-zinc-100 rounded-2xl p-7 shadow-lg space-y-4 border border-zinc-800">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold tracking-wider uppercase">
              <ShieldCheck className="w-4 h-4" />
              <span>Architectural Problem & Specification</span>
            </div>
            <h3 className="text-xl font-semibold text-white">
              The Challenge: Reliable Daily Tracking Across 100 Remote Locations With Zero Smartphone Edge
            </h3>
            <p className="text-zinc-300 text-sm leading-relaxed max-w-4xl">
              1,000 industrial workers in extreme field environments (mines, drilling sites, timber mills, offshore depots) have zero smartphone access, no 4G/5G data connectivity, and strict safety regulations banning screens. However, every site has a standard landline or 2G feature phone. The system must verify identities, detect location fraud, and sync attendance to centralized HR records in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs relative">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center font-bold text-xs text-zinc-900 mb-3">
                01
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                <Phone className="w-3.5 h-3.5 text-zinc-900" />
                <span>Tier 1: Zero-Smartphone Edge</span>
              </div>
              <h4 className="text-sm font-bold text-zinc-900 mb-2">Inbound Global PSTN / IVR Gateway</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Workers dial dedicated regional toll-free / PSTN direct lines (+91, +44, +49, +65, +81, +1) from standard landlines or 2G feature phones. Hardware cost per worker: $0. No app installations, zero screen hazard, full resilience during remote power blackouts.
              </p>
              <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400 font-mono">
                Protocol: Global SIP Trunking / PSTN
              </div>
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs relative">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center font-bold text-xs text-zinc-900 mb-3">
                02
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                <Mic className="w-3.5 h-3.5 text-blue-600" />
                <span>Tier 2: Voice AI Authentication</span>
              </div>
              <h4 className="text-sm font-bold text-zinc-900 mb-2">Hunar Voice LLM Engine</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Autonomous voice agent prompts for Employee ID, cross-references biometric voiceprint embeddings against baseline enrolled speech, and listens for acoustic site beacon frequencies transmitted over local landline hardware.
              </p>
              <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400 font-mono">
                Biometrics: Voiceprint + DTMF Beacon
              </div>
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs relative">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center font-bold text-xs text-zinc-900 mb-3">
                03
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tier 3: Automated Synthesis</span>
              </div>
              <h4 className="text-sm font-bold text-zinc-900 mb-2">Anomaly & Geofence Verification</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">
                FastAPI webhook receives raw speech audio stream and telephony caller ID. Natural Language validation checks if spoken location matches caller ID exchange. Detects duplicate buddy check-ins and logs audit flags.
              </p>
              <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400 font-mono">
                Processing: FastAPI + SQLite Engine
              </div>
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs relative">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center font-bold text-xs text-zinc-900 mb-3">
                04
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tier 4: HR Command Operations</span>
              </div>
              <h4 className="text-sm font-bold text-zinc-900 mb-2">Telemetry & Audit Trail</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Centralized command dashboard aggregates all 100 remote locations with live check-in counters, attendance rates, late alerts, and verbatim voice transcripts for tamper-proof regulatory payroll compliance.
              </p>
              <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400 font-mono">
                Output: Real-time UI & Audit Records
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white rounded-xl border border-zinc-200 shadow-xs p-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                <Phone className="w-4 h-4 text-zinc-900" />
                <span>Inbound Landline IVR Check-In Console</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Simulate a remote worker placing an inbound call from a local site landline or 2G handset.
              </p>
            </div>

            <form onSubmit={handleRunSimulator} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Worker Employee ID
                </label>
                <input
                  type="text"
                  value={simEmployeeId}
                  onChange={(e) => setSimEmployeeId(e.target.value)}
                  placeholder="e.g. 1042"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Remote Site Location Code
                </label>
                <select
                  value={simSiteCode}
                  onChange={(e) => {
                    setSimSiteCode(e.target.value);
                    setSimLocationSpoken(`Field Station ${e.target.value.replace('SITE-', '')} - Operational Depot`);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                >
                  {(overview?.sites.slice(0, 20) || []).map((s) => (
                    <option key={s.site_code} value={s.site_code}>
                      {s.site_code} - {s.site_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Spoken Location Confirmation (Verbal Audio)
                </label>
                <input
                  type="text"
                  value={simLocationSpoken}
                  onChange={(e) => setSimLocationSpoken(e.target.value)}
                  placeholder="e.g. Field Station 014 - Main Depot"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Shift Start Time Claimed
                </label>
                <input
                  type="text"
                  value={simShiftTime}
                  onChange={(e) => setSimShiftTime(e.target.value)}
                  placeholder="07:00 AM Morning Shift"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  required
                />
              </div>

              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-zinc-900">Hardware Landline Beacon Tone</div>
                  <button
                    type="button"
                    onClick={() => setSimBeaconMatch(!simBeaconMatch)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                      simBeaconMatch ? 'bg-zinc-900' : 'bg-zinc-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform mt-0.5 ml-0.5 ${
                        simBeaconMatch ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  {simBeaconMatch
                    ? 'Beacon Matches: Site hardware tone matches expected site.'
                    : 'Beacon Mismatch: Simulate fraudulent or spoofed caller ID location.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={isSimulating}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm rounded-lg transition-all shadow-xs disabled:opacity-60"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing IVR Voiceprint & Telemetry...</span>
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" />
                    <span>Dial Inbound Check-in Call</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-zinc-950 text-zinc-100 rounded-xl border border-zinc-800 shadow-xl p-6 font-mono text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-zinc-400">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-bold text-zinc-200">IVR Audio Gateway Telemetry Console</span>
              </div>
              <span className="text-[11px] text-zinc-500">Live Voice Synthesizer</span>
            </div>

            {simulationResult ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-zinc-500">Status Decision:</span>{' '}
                    <span
                      className={`font-bold ${
                        simulationResult.status === 'On-Time'
                          ? 'text-emerald-400'
                          : simulationResult.status === 'Late'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {simulationResult.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Duration: {simulationResult.call_duration_seconds}s
                  </div>
                </div>

                {simulationResult.anomaly_reason && (
                  <div className="p-3 bg-rose-950/40 rounded-lg border border-rose-800/80 text-rose-300">
                    <span className="font-bold">Anomaly Flagged:</span> {simulationResult.anomaly_reason}
                  </div>
                )}

                <div>
                  <div className="text-zinc-400 mb-1.5 font-sans font-semibold text-xs">
                    Verbatim Dialogue Transcript:
                  </div>
                  <div className="p-3 bg-black/60 rounded-lg border border-zinc-800/60 whitespace-pre-wrap leading-relaxed text-zinc-300">
                    {simulationResult.voice_transcript}
                  </div>
                </div>

                <div className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-800 flex justify-between">
                  <span>Record written to database: app.db (attendance_records)</span>
                  <span>Audio Beacon: {simulationResult.audio_site_code_verified ? 'Verified' : 'Failed'}</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-500 space-y-2">
                <Volume2 className="w-8 h-8 mx-auto text-zinc-700" />
                <p>Awaiting inbound call trigger from left panel...</p>
                <p className="text-[11px] text-zinc-600">
                  Select parameters and click "Dial Inbound Check-in Call" to simulate live IVR voice execution.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-5 bg-white rounded-xl border border-zinc-200 shadow-xs">
              <div className="text-xs text-zinc-500 font-medium">Remote Sites</div>
              <div className="text-2xl font-bold text-zinc-900 mt-1">{overview.total_sites} Locations</div>
              <div className="text-xs text-zinc-400 mt-0.5">Across 10 Global Industrial Regions</div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-zinc-200 shadow-xs">
              <div className="text-xs text-zinc-500 font-medium">Total Field Workforce</div>
              <div className="text-2xl font-bold text-zinc-900 mt-1">{overview.total_workers.toLocaleString()}</div>
              <div className="text-xs text-zinc-400 mt-0.5">Zero smartphone deployment</div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <div className="text-xs text-emerald-800 font-medium">Today's Check-In Rate</div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {overview.overall_attendance_rate}%
              </div>
              <div className="text-xs text-emerald-600 mt-0.5">
                {overview.overall_checked_in} / {overview.total_workers} logged
              </div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-amber-200 shadow-xs">
              <div className="text-xs text-amber-800 font-medium">Late Arrivals Alert</div>
              <div className="text-2xl font-bold text-amber-700 mt-1">{overview.total_late_alerts}</div>
              <div className="text-xs text-zinc-400 mt-0.5">Post-shift threshold</div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
              <div className="text-xs text-rose-800 font-medium">Anomalies Detected</div>
              <div className="text-2xl font-bold text-rose-700 mt-1">{overview.total_anomalies}</div>
              <div className="text-xs text-rose-600 mt-0.5">Flagged for supervisor review</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">
                  Remote Facility Monitoring (100 Field Stations)
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Showing {filteredSites.length} of {overview.total_sites} remote sites
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search site code or region..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 w-48"
                  />
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <button
                    onClick={() => setSiteFilter('all')}
                    className={`px-2.5 py-1 rounded-lg border ${
                      siteFilter === 'all'
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-600 border-zinc-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSiteFilter('Optimal')}
                    className={`px-2.5 py-1 rounded-lg border ${
                      siteFilter === 'Optimal'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-zinc-600 border-zinc-200'
                    }`}
                  >
                    Optimal
                  </button>
                  <button
                    onClick={() => setSiteFilter('Warning')}
                    className={`px-2.5 py-1 rounded-lg border ${
                      siteFilter === 'Warning'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-zinc-600 border-zinc-200'
                    }`}
                  >
                    Warning
                  </button>
                  <button
                    onClick={() => setSiteFilter('Critical')}
                    className={`px-2.5 py-1 rounded-lg border ${
                      siteFilter === 'Critical'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-zinc-600 border-zinc-200'
                    }`}
                  >
                    Critical
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
              {filteredSites.map((site) => (
                <div
                  key={site.site_code}
                  className="p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all text-xs space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 font-mono">{site.site_code}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${
                        site.status === 'Optimal'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : site.status === 'Warning'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                      }`}
                    >
                      {site.status}
                    </span>
                  </div>

                  <div className="text-zinc-600 truncate font-medium">{site.site_name}</div>
                  <div className="text-[11px] text-zinc-400">{site.region}</div>

                  <div>
                    <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                      <span>Rate: {site.attendance_rate}%</span>
                      <span>
                        {site.checked_in_count}/{site.total_workers}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          site.attendance_rate >= 80
                            ? 'bg-emerald-500'
                            : site.attendance_rate >= 60
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${site.attendance_rate}%` }}
                      />
                    </div>
                  </div>

                  {(site.late_count > 0 || site.anomalies_count > 0) && (
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-zinc-500 border-t border-zinc-100">
                      {site.late_count > 0 && <span className="text-amber-700">{site.late_count} Late</span>}
                      {site.anomalies_count > 0 && (
                        <span className="text-rose-700 font-semibold">{site.anomalies_count} Anomaly Flag</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">Live Voice Check-in Audit Trail</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Verbatim transcripts, telephony beacon verification, and biometric checks
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                  <tr>
                    <th className="px-6 py-3">Worker ID / Name</th>
                    <th className="px-6 py-3">Site Location</th>
                    <th className="px-6 py-3">Check-in Status</th>
                    <th className="px-6 py-3">Voiceprint Match</th>
                    <th className="px-6 py-3">Audio Beacon</th>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3 text-right">Transcript</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {overview.recent_checkins.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-zinc-900">{item.employee_name}</div>
                        <div className="text-xs text-zinc-500 font-mono mt-0.5">{item.employee_id}</div>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <div className="font-medium text-zinc-800">{item.site_name}</div>
                        <div className="text-zinc-400 font-mono mt-0.5">{item.site_code}</div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'On-Time'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'Late'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.anomaly_reason && (
                          <div className="text-[11px] text-rose-600 mt-1 max-w-xs truncate" title={item.anomaly_reason}>
                            {item.anomaly_reason}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs">
                        {item.voiceprint_match ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Mismatch</span>
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs">
                        {item.audio_site_code_verified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Confirmed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                            <X className="w-3.5 h-3.5 text-rose-600" />
                            <span>Failed DTMF</span>
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-zinc-500 font-mono">
                        {new Date(item.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedRecord(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 transition-colors"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>View Audio Log</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">
                  Voice Check-in Telephony Record
                </h3>
                <p className="text-xs text-zinc-500">
                  {selectedRecord.employee_name} ({selectedRecord.employee_id}) • {selectedRecord.site_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 bg-zinc-50 rounded-lg border border-zinc-200">
              <div>
                <span className="text-zinc-400">Status</span>
                <div className="font-semibold text-zinc-900 mt-0.5">{selectedRecord.status}</div>
              </div>
              <div>
                <span className="text-zinc-400">Biometrics</span>
                <div className="font-semibold text-emerald-600 mt-0.5">Matched</div>
              </div>
              <div>
                <span className="text-zinc-400">Duration</span>
                <div className="font-semibold text-zinc-900 mt-0.5">{selectedRecord.call_duration_seconds}s</div>
              </div>
            </div>

            {selectedRecord.anomaly_reason && (
              <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs border border-rose-200 font-medium">
                Anomaly Flag: {selectedRecord.anomaly_reason}
              </div>
            )}

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                Audio Stream Transcript
              </div>
              <div className="p-4 bg-zinc-950 text-zinc-100 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                {selectedRecord.voice_transcript || 'No voice transcript text logged.'}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-900 text-white hover:bg-zinc-800"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
