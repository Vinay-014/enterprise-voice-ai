import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  CandidateProfile,
  ExtractedJDMetadata,
  TelemetryData
} from '../types';
import {
  Search,
  Sparkles,
  Users,
  Send,
  CheckSquare,
  Square,
  TrendingUp,
  PhoneCall,
  UserX,
  PhoneForwarded,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
  MapPin,
  Clock,
  RefreshCw,
  X
} from 'lucide-react';

const SAMPLE_JDS = [
  {
    title: 'Senior Distributed Backend Engineer',
    text: 'We are seeking a Senior Distributed Systems Engineer experienced in Python, FastAPI, and asynchronous task workers. Candidates must possess hands-on familiarity with Kafka, Docker, Kubernetes, and PostgreSQL. Expected to design fault-tolerant microservices, optimize high-throughput REST APIs, and implement system observability.'
  },
  {
    title: 'Staff Full-Stack Voice AI Architect',
    text: 'Looking for a Staff Full-Stack Engineer to architect voice telephony pipelines. Deep expertise with Next.js 14, TypeScript, Tailwind CSS, React, and Python backend APIs. Understanding of Voice AI, WebRTC, telephony protocols, and microservices architecture is strongly preferred.'
  },
  {
    title: 'DevOps & Cloud Infrastructure Lead',
    text: 'Lead our Cloud Platform operations across AWS and GCP. Must demonstrate strong capabilities in Terraform, Kubernetes cluster administration, CI/CD pipelines, Docker container security, and Linux systems engineering with at least 6+ years experience.'
  }
];

export const PeopleSearchReachout: React.FC = () => {
  const [jobDescription, setJobDescription] = useState(SAMPLE_JDS[0].text);
  const [isSearching, setIsSearching] = useState(false);
  const [metadata, setMetadata] = useState<ExtractedJDMetadata | null>(null);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDispatching, setIsDispatching] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchResultMessage, setSearchResultMessage] = useState<string | null>(null);

  const fetchTelemetry = async () => {
    try {
      const tel = await api.getReachoutTelemetry();
      setTelemetry(tel);
    } catch (err) {
      console.error('Failed to load outreach telemetry:', err);
    }
  };

  const handleSearch = async (overrideJD?: string) => {
    const textToSearch = overrideJD || jobDescription;
    if (!textToSearch.trim() || textToSearch.trim().length < 10) {
      setStatusMessage({ type: 'error', text: 'Please enter a detailed Job Description to extract skills and match candidates.' });
      return;
    }

    setIsSearching(true);
    setStatusMessage(null);
    try {
      const response = await api.searchCandidates(textToSearch);
      setMetadata(response.metadata);
      setCandidates(response.candidates);
      setSearchResultMessage(response.message || null);
      // Default select top 3 qualified candidates
      const topIds = new Set(response.candidates.slice(0, 3).map((c) => c.candidate_id));
      setSelectedIds(topIds);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to search candidates.' });
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    handleSearch();
    fetchTelemetry();
  }, []);

  const toggleSelectCandidate = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.candidate_id)));
    }
  };

  const handleTriggerBulkReachout = async () => {
    if (selectedIds.size === 0) {
      setStatusMessage({ type: 'error', text: 'Please select at least one candidate for AI voice outreach.' });
      return;
    }

    setIsDispatching(true);
    setStatusMessage(null);
    try {
      const selectedArray: string[] = Array.from(selectedIds);
      const res = await api.triggerBulkReachout({
        candidate_ids: selectedArray,
        position: metadata?.domain || 'Software Engineering Role',
        job_description: jobDescription
      });

      setStatusMessage({
        type: 'success',
        text: `Successfully queued autonomous voice outreach calls for ${res.total_queued} candidates. Campaign ID: ${res.campaign_id}`
      });

      // Update local candidates status
      setCandidates((prev) =>
        prev.map((c) =>
          selectedIds.has(c.candidate_id) ? { ...c, outreach_status: 'Outreach Dispatched' } : c
        )
      );

      await fetchTelemetry();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to trigger bulk voice reachout.' });
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">People Search & Autonomous Reachout</h2>
          <p className="text-sm text-slate-400 mt-1">
            Extract talent criteria from job descriptions, discover ranked profiles, and dispatch batch Hunar Voice AI outreach.
          </p>
        </div>

        <button
          onClick={fetchTelemetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white shadow-sm transition-all self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          )}
          <div className="flex-1">{statusMessage.text}</div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Telemetry Dashboard Strip */}
      {telemetry && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 bg-[#121212] rounded-xl border border-white/10 shadow-xl">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-amber-500" />
              <span>Outreach Dispatched</span>
            </div>
            <div className="text-xl font-bold text-white font-mono mt-1.5">{telemetry.total_calls}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across {telemetry.campaigns_active} campaigns</div>
          </div>

          <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/30 shadow-xl">
            <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Interested</span>
            </div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-1.5">{telemetry.interested_count}</div>
            <div className="text-[11px] text-emerald-500/90 mt-0.5 font-medium">{telemetry.conversion_rate_pct}% conversion</div>
          </div>

          <div className="p-4 bg-[#121212] rounded-xl border border-white/10 shadow-xl">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <PhoneForwarded className="w-3.5 h-3.5 text-blue-400" />
              <span>Call Back Later</span>
            </div>
            <div className="text-xl font-bold text-white font-mono mt-1.5">{telemetry.callback_later_count}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Rescheduled slots</div>
          </div>

          <div className="p-4 bg-[#121212] rounded-xl border border-white/10 shadow-xl">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <UserX className="w-3.5 h-3.5 text-slate-400" />
              <span>Not Interested</span>
            </div>
            <div className="text-xl font-bold text-white font-mono mt-1.5">{telemetry.not_interested_count}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Politely declined</div>
          </div>

          <div className="p-4 bg-[#121212] rounded-xl border border-white/10 shadow-xl">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Unreachable</span>
            </div>
            <div className="text-xl font-bold text-white font-mono mt-1.5">{telemetry.unreachable_count}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Voicemail / No answer</div>
          </div>

          <div className="p-4 bg-[#121212] rounded-xl border border-white/10 shadow-xl">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Avg Call Length</span>
            </div>
            <div className="text-xl font-bold text-white font-mono mt-1.5">{telemetry.average_call_duration_seconds}s</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{Math.floor(telemetry.average_call_duration_seconds / 60)}m {telemetry.average_call_duration_seconds % 60}s voice dialogue</div>
          </div>
        </div>
      )}

      {/* Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Job Description Input & Metadata Extraction */}
        <div className="lg:col-span-5 bg-[#121212] rounded-xl border border-white/10 shadow-xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-500">Job Description Input</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">NLP Parser Active</span>
          </div>

          {/* Sample JD loader chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Quick Load Template:</span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_JDS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setJobDescription(sample.text);
                    handleSearch(sample.text);
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border border-white/10 hover:border-amber-500/50 bg-black/40 hover:bg-amber-500/10 text-slate-300 hover:text-white transition-all text-left"
                >
                  {sample.title}
                </button>
              ))}
            </div>
          </div>

          <div>
            <textarea
              rows={8}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste complete Job Description text here..."
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-black/40 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-all font-sans leading-relaxed"
            />
          </div>

          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={isSearching}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-lg transition-all shadow-md shadow-amber-500/10 disabled:opacity-50"
          >
            {isSearching ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Parsing & Matching Candidates...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Extract Skills & Match Profiles</span>
              </>
            )}
          </button>

          {/* Extracted Metadata Panel */}
          {metadata && (
            <div className="pt-4 border-t border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>Extracted Parameters</span>
              </div>

              {metadata.provider && (
                <div className="p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/30 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">People Search Source:</span>
                    <span className="font-semibold text-amber-400 font-mono">{metadata.provider}</span>
                  </div>
                  {metadata.api_status && (
                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                      <span className="text-slate-500">Status:</span>
                      <span className={`font-mono font-medium ${metadata.api_status.includes('Live') ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {metadata.api_status}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-black/40 rounded-lg border border-white/10">
                  <div className="text-slate-400">Identified Domain</div>
                  <div className="font-semibold text-white mt-0.5">{metadata.domain}</div>
                </div>
                <div className="p-2.5 bg-black/40 rounded-lg border border-white/10">
                  <div className="text-slate-400">Experience Tier</div>
                  <div className="font-semibold text-white mt-0.5">{metadata.experience_level}</div>
                </div>
                <div className="p-2.5 bg-black/40 rounded-lg border border-white/10 col-span-2">
                  <div className="text-slate-400">Min Experience Required</div>
                  <div className="font-semibold text-amber-400 mt-0.5 font-mono">
                    {metadata.min_years_required}+ yrs
                    {metadata.max_years_required != null ? ` (up to ${metadata.max_years_required} yrs)` : ''}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-400 mb-2">Required Skills Auto-Extracted ({metadata.extracted_skills.length}):</div>
                <div className="flex flex-wrap gap-1.5">
                  {metadata.extracted_skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-slate-300 border border-white/10"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-400 mb-1.5">Target Location Clusters:</div>
                <div className="flex flex-wrap gap-1 text-[11px] text-slate-400">
                  {metadata.suggested_locations.map((loc, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                      <MapPin className="w-2.5 h-2.5 text-slate-500" />
                      {loc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Matched Candidates & Bulk Outreach */}
        <div className="lg:col-span-7 bg-[#121212] rounded-xl border border-white/10 shadow-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-500">Ranked Candidate Matches</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {candidates.length} profile{candidates.length !== 1 ? 's' : ''} ranked by skill match score
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5"
              >
                {selectedIds.size === candidates.length && candidates.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-amber-500" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500" />
                )}
                <span>Select All ({selectedIds.size})</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerBulkReachout}
                disabled={isDispatching || selectedIds.size === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition-all shadow-md shadow-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDispatching ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Queueing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Trigger AI Voice Outreach ({selectedIds.size})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Empty State */}
          {candidates.length === 0 && searchResultMessage && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <AlertCircle className="w-10 h-10 text-amber-500/60" />
              <div>
                <p className="text-sm font-semibold text-slate-300">{searchResultMessage}</p>
                {metadata?.min_years_required != null && (
                  <p className="text-xs text-slate-500 mt-1">
                    Threshold: <span className="text-amber-400 font-mono">{metadata.min_years_required}+ yrs</span> required
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {candidates.map((cand) => {
              const isSelected = selectedIds.has(cand.candidate_id);
              const matchingSkillsSet = new Set(
                (cand.matching_skills || []).map((s) => s.toLowerCase())
              );
              return (
                <div
                  key={cand.candidate_id}
                  onClick={() => toggleSelectCandidate(cand.candidate_id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                      : 'bg-black/30 border-white/10 hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </div>

                      <div>
                        <div className="font-semibold text-white text-sm flex items-center gap-2">
                          <span>{cand.name}</span>
                          <span className="text-xs font-normal text-slate-400">• {cand.title}</span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                          <span className="flex items-center gap-1 font-sans">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {cand.location}
                          </span>
                          <span>{cand.contact_phone}</span>
                          <span className="font-sans text-slate-500">{cand.experience_years} yrs exp</span>
                        </div>

                        {/* Skill Badges — highlighted if matching */}
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {cand.skills.map((s, i) => (
                            <span
                              key={i}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                                matchingSkillsSet.has(s.toLowerCase())
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                                  : 'bg-white/5 text-slate-400 border-white/10'
                              }`}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Match Score Gauge */}
                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <TrendingUp className="w-3 h-3" />
                        <span>{cand.match_percentage}% Match</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1.5">{cand.outreach_status}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
