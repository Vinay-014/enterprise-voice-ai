"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { CallRecord } from '@/types';
import {
  PhoneCall,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Volume2,
  RefreshCw,
  Sparkles,
  Send,
  Sliders,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';

export const HiringAssistant: React.FC = () => {
  const [candidateName, setCandidateName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [position, setPosition] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [isLoadingCalls, setIsLoadingCalls] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);

  const fetchCalls = async () => {
    setIsLoadingCalls(true);
    try {
      const data = await api.getCalls(statusFilter === 'all' ? undefined : statusFilter);
      setCalls(data);
    } catch (err: any) {
      console.error('Failed to fetch call records:', err);
    } finally {
      setIsLoadingCalls(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [statusFilter]);

  const handleTriggerCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim() || !phoneNumber.trim() || !position.trim()) {
      setFeedbackMessage({ type: 'error', text: 'Please fill in candidate name, phone number, and position.' });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const newCall = await api.triggerCall({
        candidate_name: candidateName,
        phone_number: phoneNumber,
        position,
        custom_prompt: customPrompt.trim() ? customPrompt : undefined
      });

      setFeedbackMessage({
        type: 'success',
        text: `Voice call successfully queued for ${newCall.candidate_name}. Call ID: ${newCall.call_id}`
      });

      setCandidateName('');
      setPhoneNumber('');
      setPosition('');
      setCustomPrompt('');

      await fetchCalls();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to dispatch voice call.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (name: string, phone: string, pos: string, prompt: string) => {
    setCandidateName(name);
    setPhoneNumber(phone);
    setPosition(pos);
    setCustomPrompt(prompt);
  };

  const handleSimulateWebhook = async (call: CallRecord) => {
    setIsSimulatingWebhook(true);
    try {
      await api.sendWebhook({
        call_id: call.call_id,
        status: 'Completed',
        duration_seconds: 245,
        transcript: `Agent: Hello ${call.candidate_name}, this is the Hunar AI automated screening agent for ${call.position}.\n\nCandidate: Hello! Yes, I was expecting your call.\n\nAgent: Wonderful. Can you explain your primary experience with modern distributed architectures and reliability engineering?\n\nCandidate: In my previous position, I maintained high-throughput microservices processing over 12 million events daily. I also implemented proactive telemetry alerts which decreased MTTR by 45%.\n\nAgent: Excellent. Are you currently available to start within standard notice?\n\nCandidate: Yes, available within 2 weeks.\n\nAgent: Thank you. Your screening responses have been validated and submitted to the engineering panel.`,
        audio_url: `https://api.voice.hunar.ai/recordings/${call.call_id}.mp3`,
        overall_score: 93.5,
        interest_score: 95.0,
        answers_summary: 'Superb technical clarity, verifiable distributed systems track record, target compensation in range, immediate availability.',
        disposition: 'Interested'
      });

      await fetchCalls();
      setFeedbackMessage({
        type: 'success',
        text: `Simulated Hunar webhook callback processed for ${call.call_id}. Scores and transcript updated.`
      });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to trigger simulated webhook' });
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ringing':
        return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
      case 'initiated':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'failed':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">AI Voice Screening Assistant</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Dispatch outbound autonomous screening calls via Hunar Voice API and monitor real-time transcripts, scoring, and telemetry.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCalls}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCalls ? 'animate-spin' : ''}`} />
            Refresh Feed
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          )}
          <div className="flex-1">{feedbackMessage.text}</div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 shadow-xs p-6">
          <div className="flex items-center gap-2 pb-4 border-b border-zinc-100 mb-5">
            <PhoneCall className="w-5 h-5 text-zinc-900" />
            <h3 className="text-base font-semibold text-zinc-900">Initiate Outbound Voice Screening</h3>
          </div>

          <form onSubmit={handleTriggerCall} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Candidate Name *
                </label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g. Rachel Foster"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Phone Number (E.164) *
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1-415-555-0182"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                Target Position *
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. Senior Backend Engineer (FastAPI / Systems)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Custom AI Voice Prompt / Screening Directives
                </label>
                <span className="text-[11px] text-zinc-400">Optional</span>
              </div>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                placeholder="Specify required skills to probe, architectural trade-offs, salary alignment check, and availability..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Encrypted bearer authentication active</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm rounded-lg transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting API...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Trigger Voice Call</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-zinc-900" />
            <h3 className="text-sm font-semibold text-zinc-900">Pre-configured Test Profiles</h3>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Click any profile below to immediately populate the screening form with calibrated role parameters:
          </p>

          <div className="space-y-2.5">
            <button
              onClick={() =>
                handleQuickFill(
                  'Maya Lin',
                  '+1-415-555-0814',
                  'Staff Python Backend Architect',
                  'Evaluate async FastAPI, SQLAlchemy 2.0 connection pooling, database deadlocks mitigation, and Kafka event pipelines.'
                )
              }
              className="w-full text-left p-3 rounded-lg border border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-xs transition-all text-xs group"
            >
              <div className="font-semibold text-zinc-900 group-hover:text-zinc-950 flex items-center justify-between">
                <span>Maya Lin</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="text-zinc-500 mt-0.5">Staff Python Backend Architect</div>
            </button>

            <button
              onClick={() =>
                handleQuickFill(
                  'Tariq Hameed',
                  '+1-512-555-0329',
                  'Senior Cloud Platform Engineer',
                  'Assess multi-tenant Kubernetes architecture, Terraform infrastructure as code, and zero-trust VPC networking.'
                )
              }
              className="w-full text-left p-3 rounded-lg border border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-xs transition-all text-xs group"
            >
              <div className="font-semibold text-zinc-900 group-hover:text-zinc-950 flex items-center justify-between">
                <span>Tariq Hameed</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="text-zinc-500 mt-0.5">Senior Cloud Platform Engineer</div>
            </button>

            <button
              onClick={() =>
                handleQuickFill(
                  'Claire Dubois',
                  '+1-212-555-0955',
                  'Voice AI Telephony Specialist',
                  'Probe WebRTC protocols, audio transcoding latency, Hunar Voice API integration patterns, and telephony webhook handling.'
                )
              }
              className="w-full text-left p-3 rounded-lg border border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-xs transition-all text-xs group"
            >
              <div className="font-semibold text-zinc-900 group-hover:text-zinc-950 flex items-center justify-between">
                <span>Claire Dubois</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="text-zinc-500 mt-0.5">Voice AI Telephony Specialist</div>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-900">Live Voice Screening Records</h3>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-100 text-zinc-700">
              {calls.length} logged
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-500">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-zinc-200 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="all">All States</option>
              <option value="Completed">Completed</option>
              <option value="Ringing">Ringing</option>
              <option value="Initiated">Initiated</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3">Candidate / Role</th>
                <th className="px-6 py-3">Call ID / Status</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-6 py-3">AI Evaluation</th>
                <th className="px-6 py-3">Disposition</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {calls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 text-sm">
                    No voice calls found matching criteria. Trigger a new screening call above.
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <tr key={call.call_id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-900">{call.candidate_name}</div>
                      <div className="text-xs text-zinc-500 font-mono mt-0.5">{call.phone_number}</div>
                      <div className="text-xs text-zinc-600 mt-1">{call.position}</div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(
                          call.status
                        )}`}
                      >
                        {call.status}
                      </span>
                      <div className="text-[11px] text-zinc-400 font-mono mt-1">{call.call_id}</div>
                    </td>

                    <td className="px-6 py-4 text-xs text-zinc-600">
                      <div className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{call.duration_seconds > 0 ? `${call.duration_seconds}s` : '—'}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {call.status === 'Completed' ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">Score:</span>
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              {call.overall_score}%
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate max-w-xs" title={call.answers_summary || ''}>
                            {call.answers_summary || 'Analysis complete'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">In progress...</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          call.disposition === 'Interested'
                            ? 'bg-emerald-100 text-emerald-800'
                            : call.disposition === 'Not Interested'
                            ? 'bg-zinc-200 text-zinc-700'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {call.disposition}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedCall(call)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Transcript</span>
                      </button>

                      {call.status !== 'Completed' && (
                        <button
                          onClick={() => handleSimulateWebhook(call)}
                          disabled={isSimulatingWebhook}
                          title="Simulate Hunar Webhook callback for test verification"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Complete Webhook</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">
                  Voice Screening Transcript & Evaluation
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {selectedCall.candidate_name} • {selectedCall.position} ({selectedCall.call_id})
                </p>
              </div>
              <button
                onClick={() => setSelectedCall(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-3 gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-center text-xs">
                <div>
                  <div className="text-zinc-500">Overall Match</div>
                  <div className="text-base font-semibold text-emerald-600 mt-0.5">
                    {selectedCall.overall_score > 0 ? `${selectedCall.overall_score}%` : 'Pending'}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500">Candidate Interest</div>
                  <div className="text-base font-semibold text-blue-600 mt-0.5">
                    {selectedCall.interest_score > 0 ? `${selectedCall.interest_score}%` : 'Pending'}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500">Call Duration</div>
                  <div className="text-base font-semibold text-zinc-800 mt-0.5">
                    {selectedCall.duration_seconds} seconds
                  </div>
                </div>
              </div>

              {selectedCall.answers_summary && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    AI Analysis Summary
                  </h4>
                  <p className="text-xs text-zinc-700 leading-relaxed bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                    {selectedCall.answers_summary}
                  </p>
                </div>
              )}

              {selectedCall.audio_recording_url && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-800">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-blue-600" />
                    <span>Audio Recording available on Hunar Cloud Gateway</span>
                  </div>
                  <a
                    href={selectedCall.audio_recording_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline hover:text-blue-950"
                  >
                    Listen Audio
                  </a>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Dialogue Transcript
                </h4>
                <div className="p-4 bg-zinc-950 text-zinc-100 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto border border-zinc-800">
                  {selectedCall.transcript || 'No transcript text available for this call.'}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50 flex justify-end">
              <button
                onClick={() => setSelectedCall(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
