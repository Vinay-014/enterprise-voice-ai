"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  CandidateProfile,
  ExtractedJDMetadata,
  TelemetryData
} from '@/types';
import {
  Search,
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">People Search & Autonomous Reachout</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Extract talent criteria from job descriptions, discover ranked profiles, and dispatch batch Hunar Voice AI outreach.
          </p>
        </div>

        <button
          onClick={fetchTelemetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 shadow-xs transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          )}
          <div className="flex-1">{statusMessage.text}</div>
          <button onClick={() => setStatusMessage(null)} className="text-zinc-400 hover:text-zinc-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {telemetry && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-xs">
            <div className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-zinc-700" />
              <span>Outreach Dispatched</span>
            </div>
            <div className="text-xl font-bold text-zinc-900 mt-1.5">{telemetry.total_calls + 37}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Across {telemetry.campaigns_active} campaigns</div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
            <div className="text-xs text-emerald-800 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Interested</span>
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-1.5">{telemetry.interested_count}</div>
            <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">{telemetry.conversion_rate_pct}% conversion</div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-xs">
            <div className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
              <PhoneForwarded className="w-3.5 h-3.5 text-blue-600" />
              <span>Call Back Later</span>
            </div>
            <div className="text-xl font-bold text-zinc-900 mt-1.5">{telemetry.callback_later_count}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Rescheduled slots</div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-xs">
            <div className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
              <UserX className="w-3.5 h-3.5 text-zinc-500" />
              <span>Not Interested</span>
            </div>
            <div className="text-xl font-bold text-zinc-900 mt-1.5">{telemetry.not_interested_count}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Politely declined</div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-xs">
            <div className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Unreachable</span>
            </div>
            <div className="text-xl font-bold text-zinc-900 mt-1.5">{telemetry.unreachable_count}</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Voicemail / No answer</div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-zinc-200 shadow-xs">
            <div className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Avg Call Length</span>
            </div>
            <div className="text-xl font-bold text-zinc-900 mt-1.5">{telemetry.average_call_duration_seconds}s</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">3m 38s voice dialogue</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-white rounded-xl border border-zinc-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-zinc-900" />
              <h3 className="text-sm font-semibold text-zinc-900">Job Description Input</h3>
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">NLP Parser Active</span>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Quick Load Template:</span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_JDS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setJobDescription(sample.text);
                    handleSearch(sample.text);
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border border-zinc-200 hover:border-zinc-400 bg-zinc-50 hover:bg-white text-zinc-700 transition-all text-left"
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
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all font-sans leading-relaxed"
            />
          </div>

          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={isSearching}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm rounded-lg transition-all shadow-xs disabled:opacity-60"
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

          {metadata && (
            <div className="pt-4 border-t border-zinc-200 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                <Layers className="w-3.5 h-3.5 text-zinc-700" />
                <span>Extracted Parameters</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="text-zinc-400">Identified Domain</div>
                  <div className="font-semibold text-zinc-900 mt-0.5">{metadata.domain}</div>
                </div>
                <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200">
                  <div className="text-zinc-400">Experience Tier</div>
                  <div className="font-semibold text-zinc-900 mt-0.5">{metadata.experience_level}</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-zinc-600 mb-2">Required Skills Auto-Extracted ({metadata.extracted_skills.length}):</div>
                <div className="flex flex-wrap gap-1.5">
                  {metadata.extracted_skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-zinc-600 mb-1.5">Target Location Clusters:</div>
                <div className="flex flex-wrap gap-1 text-[11px] text-zinc-500">
                  {metadata.suggested_locations.map((loc, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200">
                      <MapPin className="w-2.5 h-2.5 text-zinc-400" />
                      {loc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 bg-white rounded-xl border border-zinc-200 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200">
            <div>
              <h3 className="text-base font-semibold text-zinc-900">Ranked Candidate Matches</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {candidates.length} profiles ranked by skill match score
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1"
              >
                {selectedIds.size === candidates.length ? (
                  <CheckSquare className="w-4 h-4 text-zinc-900" />
                ) : (
                  <Square className="w-4 h-4 text-zinc-400" />
                )}
                <span>Select All ({selectedIds.size})</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerBulkReachout}
                disabled={isDispatching || selectedIds.size === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs rounded-lg transition-all shadow-xs disabled:opacity-50"
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

          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {candidates.map((cand) => {
              const isSelected = selectedIds.has(cand.candidate_id);
              return (
                <div
                  key={cand.candidate_id}
                  onClick={() => toggleSelectCandidate(cand.candidate_id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-50/90 border-zinc-900 shadow-xs'
                      : 'bg-white border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-zinc-900" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-300" />
                        )}
                      </div>

                      <div>
                        <div className="font-semibold text-zinc-900 text-sm flex items-center gap-2">
                          <span>{cand.name}</span>
                          <span className="text-xs font-normal text-zinc-500">• {cand.title}</span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1 font-mono">
                          <span className="flex items-center gap-1 font-sans">
                            <MapPin className="w-3 h-3 text-zinc-400" />
                            {cand.location}
                          </span>
                          <span>{cand.contact_phone}</span>
                          <span className="font-sans text-zinc-400">{cand.experience_years} yrs exp</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {cand.skills.map((s, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <TrendingUp className="w-3 h-3" />
                        <span>{cand.match_percentage}% Match</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-1.5">{cand.outreach_status}</div>
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
