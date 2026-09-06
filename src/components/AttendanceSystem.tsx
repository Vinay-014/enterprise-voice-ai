import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { AttendanceOverview, AttendanceRecord } from '../types';
import {
  Phone,
  Radio,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Users,
  Clock,
  Volume2,
  Sliders,
  Search,
  RefreshCw,
  FileCheck,
  Mic,
  ArrowRight,
  Server,
  Activity,
  Layers,
  MapPin,
  Check,
  X
} from 'lucide-react';

export const AttendanceSystem: React.FC = () => {
  const [overview, setOverview] = useState<AttendanceOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'architecture' | 'simulator'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState<'all' | 'Optimal' | 'Warning' | 'Critical'>('all');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // Simulator state
  const [simEmployeeId, setSimEmployeeId] = useState('1042');
  const [simSiteCode, setSimSiteCode] = useState('SITE-014');
  const [simLocationSpoken, setSimLocationSpoken] = useState('Field Station 014 - Main Warehouse');
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
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-black">
              Enterprise Case Study
            </span>
            <span className="text-xs text-slate-400 font-medium">1,000 Workers • 100 Remote Sites • Zero Smartphones</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Smartphone-Free Voice Attendance & Command Platform
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Fully conversational inbound telephony system designed for rugged remote facilities. Workers authenticate via landline or basic 2G feature phones using biometric voiceprints and audio beacons.
          </p>
        </div>

        {/* View mode tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-black font-bold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            HR Command Dashboard
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'architecture'
                ? 'bg-amber-500 text-black font-bold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Solution Architecture
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'simulator'
                ? 'bg-amber-500 text-black font-bold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Live IVR Simulator
          </button>
        </div>
      </div>

      {/* VIEW: SOLUTION ARCHITECTURE */}
      {activeTab === 'architecture' && (
        <div className="space-y-8">
          {/* Executive Summary Card */}
          <div className="bg-[#121212] text-slate-200 rounded-2xl p-7 shadow-xl space-y-4 border border-white/10">
            <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold tracking-wider uppercase">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <span>Architectural Problem & Specification</span>
            </div>
            <h3 className="text-xl font-semibold text-white">
              The Challenge: Reliable Daily Tracking Across 100 Remote Locations With Zero Smartphone Edge
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed max-w-4xl">
              1,000 industrial workers in extreme field environments (mines, drilling sites, timber mills, offshore depots) have zero smartphone access, no 4G/5G data connectivity, and strict safety regulations banning screens. However, every site has a standard landline or 2G feature phone. The system must verify identities, detect location fraud, and sync attendance to centralized HR records in real time.
            </p>
          </div>

          {/* 4-Tier Interactive Architecture Flow */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Tier 1 */}
            <div className="bg-[#121212] rounded-xl border border-white/10 p-5 shadow-xl relative">
              <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center font-bold text-xs text-amber-500 mb-3">
                01
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1">
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                <span>Tier 1: Zero-Smartphone Edge</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-2">Inbound Toll-Free IVR</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Workers dial a dedicated 1-800 toll-free number from any standard landline or 2G feature phone. Hardware cost per worker: $0. No app installations, zero battery concerns, and full resilience during weather blackouts.
              </p>
              <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-500 font-mono">
                Protocol: SIP Trunking / PSTN
              </div>
            </div>

            {/* Tier 2 */}
            <div className="bg-[#121212] rounded-xl border border-white/10 p-5 shadow-xl relative">
              <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center font-bold text-xs text-amber-500 mb-3">
                02
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1">
                <Mic className="w-3.5 h-3.5 text-blue-400" />
                <span>Tier 2: Voice AI Authentication</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-2">Hunar Voice LLM Engine</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Autonomous voice agent prompts for Employee ID, cross-references biometric voiceprint embeddings against baseline enrolled speech, and listens for acoustic site beacon frequencies transmitted over local landline hardware.
              </p>
              <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-500 font-mono">
                Biometrics: Voiceprint + DTMF Beacon
              </div>
            </div>

            {/* Tier 3 */}
            <div className="bg-[#121212] rounded-xl border border-white/10 p-5 shadow-xl relative">
              <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center font-bold text-xs text-amber-500 mb-3">
                03
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>Tier 3: Automated Synthesis</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-2">Anomaly & Geofence Verification</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                FastAPI webhook receives raw speech audio stream and telephony caller ID. Natural Language validation checks if spoken location matches caller ID exchange. Detects duplicate buddy check-ins and logs audit flags.
              </p>
              <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-500 font-mono">
                Processing: FastAPI + SQLite Engine
              </div>
            </div>

            {/* Tier 4 */}
            <div className="bg-[#121212] rounded-xl border border-white/10 p-5 shadow-xl relative">
              <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center font-bold text-xs text-amber-500 mb-3">
                04
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tier 4: HR Command Operations</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-2">Telemetry & Audit Trail</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Centralized command dashboard aggregates all 100 remote locations with live check-in counters, attendance rates, late alerts, and verbatim voice transcripts for tamper-proof regulatory payroll compliance.
              </p>
              <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-500 font-mono">
                Output: Real-time UI & Audit Records
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: LIVE IVR SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-[#121212] rounded-xl border border-white/10 shadow-xl p-6 space-y-5">
            <div className="pb-3 border-b border-white/10">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-500" />
                <span>Inbound Landline IVR Check-In Console</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Simulate a remote worker placing an inbound call from a local site landline or 2G handset.
              </p>
            </div>

            <form onSubmit={handleRunSimulator} className="space-y-4">
              <div>
                <label htmlFor="sim-employee-id" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Worker Employee ID
                </label>
                <input
                  id="sim-employee-id"
                  name="employee_id"
                  type="text"
                  autoComplete="username"
                  value={simEmployeeId}
                  onChange={(e) => setSimEmployeeId(e.target.value)}
                  placeholder="e.g. 1042"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-all"
                  required
                />
              </div>

              <div>
                <label htmlFor="sim-site-code" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Remote Site Location Code
                </label>
                <select
                  id="sim-site-code"
                  name="site_code"
                  value={simSiteCode}
                  onChange={(e) => {
                    setSimSiteCode(e.target.value);
                    setSimLocationSpoken(`Field Station ${e.target.value.replace('SITE-', '')} - Operational Depot`);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 font-mono"
                >
                  {(overview?.sites.slice(0, 20) || []).map((s) => (
                    <option key={s.site_code} value={s.site_code} className="bg-[#121212] text-slate-200">
                      {s.site_code} - {s.site_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sim-location-spoken" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Spoken Location Confirmation (Verbal Audio)
                </label>
                <input
                  id="sim-location-spoken"
                  name="location_spoken"
                  type="text"
                  autoComplete="off"
                  value={simLocationSpoken}
                  onChange={(e) => setSimLocationSpoken(e.target.value)}
                  placeholder="e.g. Field Station 014 - Main Depot"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-all"
                  required
                />
              </div>

              <div>
                <label htmlFor="sim-shift-time" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Shift Start Time Claimed
                </label>
                <input
                  id="sim-shift-time"
                  name="shift_time"
                  type="text"
                  autoComplete="off"
                  value={simShiftTime}
                  onChange={(e) => setSimShiftTime(e.target.value)}
                  placeholder="07:00 AM Morning Shift"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-all"
                  required
                />
              </div>

              {/* Hardware Beacon Simulation toggle */}
              <div className="p-3 bg-black/40 rounded-lg border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-slate-200">Hardware Landline Beacon Tone</div>
                  <button
                    type="button"
                    onClick={() => setSimBeaconMatch(!simBeaconMatch)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                      simBeaconMatch ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform mt-0.5 ml-0.5 ${
                        simBeaconMatch ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {simBeaconMatch
                    ? 'Beacon Matches: Site hardware tone matches expected site.'
                    : 'Beacon Mismatch: Simulate fraudulent or spoofed caller ID location.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={isSimulating}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-lg transition-all shadow-md shadow-amber-500/10 disabled:opacity-50"
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

          {/* Simulator Terminal Output */}
          <div className="lg:col-span-7 bg-black text-slate-200 rounded-xl border border-white/10 shadow-2xl p-6 font-mono text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-bold text-amber-400">IVR Audio Gateway Telemetry Console</span>
              </div>
              <span className="text-[11px] text-slate-500">Live Voice Synthesizer</span>
            </div>

            {simulationResult ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-3 bg-[#121212] rounded-lg border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400">Status Decision:</span>{' '}
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
                  <div className="text-[11px] text-slate-400 font-mono">
                    Duration: {simulationResult.call_duration_seconds}s
                  </div>
                </div>

                {simulationResult.anomaly_reason && (
                  <div className="p-3 bg-rose-950/50 rounded-lg border border-rose-800/80 text-rose-300">
                    <span className="font-bold">Anomaly Flagged:</span> {simulationResult.anomaly_reason}
                  </div>
                )}

                <div>
                  <div className="text-slate-400 mb-1.5 font-sans font-semibold text-xs">
                    Verbatim Dialogue Transcript:
                  </div>
                  <div className="p-3 bg-black/90 rounded-lg border border-white/10 whitespace-pre-wrap leading-relaxed text-amber-300/90 font-mono">
                    {simulationResult.voice_transcript}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 pt-2 border-t border-white/10 flex justify-between">
                  <span>Record written to database: app.db (attendance_records)</span>
                  <span>Audio Beacon: {simulationResult.audio_site_code_verified ? 'Verified' : 'Failed'}</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Volume2 className="w-8 h-8 mx-auto text-slate-700" />
                <p>Awaiting inbound call trigger from left panel...</p>
                <p className="text-[11px] text-slate-600">
                  Select parameters and click "Dial Inbound Check-in Call" to simulate live IVR voice execution.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: HR COMMAND DASHBOARD */}
      {activeTab === 'dashboard' && overview && (
        <div className="space-y-6">
          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-5 bg-[#121212] rounded-xl border border-white/10 shadow-xl">
              <div className="text-xs text-slate-400 font-medium">Remote Sites</div>
              <div className="text-2xl font-bold text-white mt-1 font-mono">{overview.total_sites} Locations</div>
              <div className="text-xs text-slate-500 mt-0.5">Across 6 Geographic Regions</div>
            </div>

            <div className="p-5 bg-[#121212] rounded-xl border border-white/10 shadow-xl">
              <div className="text-xs text-slate-400 font-medium">Total Field Workforce</div>
              <div className="text-2xl font-bold text-white mt-1 font-mono">{overview.total_workers.toLocaleString()}</div>
              <div className="text-xs text-slate-500 mt-0.5">Zero smartphone deployment</div>
            </div>

            <div className="p-5 bg-emerald-500/5 rounded-xl border border-emerald-500/30 shadow-xl">
              <div className="text-xs text-emerald-400 font-medium">Today's Check-In Rate</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                {overview.overall_attendance_rate}%
              </div>
              <div className="text-xs text-emerald-500/90 mt-0.5 font-medium">
                {overview.overall_checked_in} / {overview.total_workers} logged
              </div>
            </div>

            <div className="p-5 bg-amber-500/5 rounded-xl border border-amber-500/30 shadow-xl">
              <div className="text-xs text-amber-400 font-medium">Late Arrivals Alert</div>
              <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">{overview.total_late_alerts}</div>
              <div className="text-xs text-slate-500 mt-0.5">Post-shift threshold</div>
            </div>

            <div className="p-5 bg-rose-500/5 rounded-xl border border-rose-500/30 shadow-xl">
              <div className="text-xs text-rose-400 font-medium">Anomalies Detected</div>
              <div className="text-2xl font-bold text-rose-400 mt-1 font-mono">{overview.total_anomalies}</div>
              <div className="text-xs text-rose-400/90 mt-0.5 font-medium">Flagged for supervisor review</div>
            </div>
          </div>

          {/* 100 Sites Overview & Filters */}
          <div className="bg-[#121212] rounded-xl border border-white/10 shadow-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-500">
                  Remote Facility Monitoring (100 Field Stations)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing {filteredSites.length} of {overview.total_sites} remote sites
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <label htmlFor="search-site-query" className="sr-only">
                    Search site code or region
                  </label>
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" aria-hidden="true" />
                  <input
                    id="search-site-query"
                    name="search_site_query"
                    type="search"
                    autoComplete="off"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search site code or region..."
                    aria-label="Search site code or region"
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 w-48"
                  />
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <button
                    onClick={() => setSiteFilter('all')}
                    className={`px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      siteFilter === 'all'
                        ? 'bg-amber-500 text-black border-amber-500 font-bold'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSiteFilter('Optimal')}
                    className={`px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      siteFilter === 'Optimal'
                        ? 'bg-emerald-500 text-black border-emerald-500 font-bold'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    Optimal
                  </button>
                  <button
                    onClick={() => setSiteFilter('Warning')}
                    className={`px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      siteFilter === 'Warning'
                        ? 'bg-amber-500 text-black border-amber-500 font-bold'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    Warning
                  </button>
                  <button
                    onClick={() => setSiteFilter('Critical')}
                    className={`px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      siteFilter === 'Critical'
                        ? 'bg-rose-500 text-white border-rose-500 font-bold'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    Critical
                  </button>
                </div>
              </div>
            </div>

            {/* Sites Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
              {filteredSites.map((site) => (
                <div
                  key={site.site_code}
                  className="p-3.5 rounded-xl border border-white/10 bg-black/30 hover:border-white/20 transition-all text-xs space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono">{site.site_code}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium text-[10px] ${
                        site.status === 'Optimal'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : site.status === 'Warning'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold'
                      }`}
                    >
                      {site.status}
                    </span>
                  </div>

                  <div className="text-slate-300 truncate font-medium">{site.site_name}</div>
                  <div className="text-[11px] text-slate-500">{site.region}</div>

                  {/* Attendance Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Rate: {site.attendance_rate}%</span>
                      <span>
                        {site.checked_in_count}/{site.total_workers}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden">
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
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400 border-t border-white/10">
                      {site.late_count > 0 && <span className="text-amber-400">{site.late_count} Late</span>}
                      {site.anomalies_count > 0 && (
                        <span className="text-rose-400 font-semibold">{site.anomalies_count} Anomaly Flag</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Voice Audit Trail */}
          <div className="bg-[#121212] rounded-xl border border-white/10 shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-500">Live Voice Check-in Audit Trail</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verbatim transcripts, telephony beacon verification, and biometric checks
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10">
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
                <tbody className="divide-y divide-white/5">
                  {overview.recent_checkins.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{item.employee_name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{item.employee_id}</div>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <div className="font-medium text-slate-300">{item.site_name}</div>
                        <div className="text-slate-500 font-mono mt-0.5">{item.site_code}</div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'On-Time'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : item.status === 'Late'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold'
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.anomaly_reason && (
                          <div className="text-[11px] text-rose-400 mt-1 max-w-xs truncate" title={item.anomaly_reason}>
                            {item.anomaly_reason}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs">
                        {item.voiceprint_match ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Mismatch</span>
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs">
                        {item.audio_site_code_verified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Confirmed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                            <X className="w-3.5 h-3.5 text-rose-400" />
                            <span>Failed DTMF</span>
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                        {new Date(item.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedRecord(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
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

      {/* Transcript Log Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] rounded-2xl border border-white/10 shadow-2xl max-w-xl w-full p-6 space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Voice Check-in Telephony Record
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedRecord.employee_name} ({selectedRecord.employee_id}) • {selectedRecord.site_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 bg-black/40 rounded-lg border border-white/10">
              <div>
                <span className="text-slate-400">Status</span>
                <div className="font-semibold text-white mt-0.5">{selectedRecord.status}</div>
              </div>
              <div>
                <span className="text-slate-400">Biometrics</span>
                <div className="font-semibold text-emerald-400 mt-0.5">Matched</div>
              </div>
              <div>
                <span className="text-slate-400">Duration</span>
                <div className="font-semibold text-white mt-0.5">{selectedRecord.call_duration_seconds}s</div>
              </div>
            </div>

            {selectedRecord.anomaly_reason && (
              <div className="p-3 bg-rose-950/50 text-rose-300 rounded-lg text-xs border border-rose-800/80 font-medium">
                Anomaly Flag: {selectedRecord.anomaly_reason}
              </div>
            )}

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1">
                Audio Stream Transcript
              </div>
              <div className="p-4 bg-black text-amber-300/90 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto border border-white/10">
                {selectedRecord.voice_transcript || 'No voice transcript text logged.'}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-colors"
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
