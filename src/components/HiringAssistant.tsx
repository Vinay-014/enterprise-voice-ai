import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';
import { CallRecord } from '../types';
import {
  PhoneCall,
  UserCheck,
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
  PhoneOff,
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
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const isFetchingRef = useRef(false);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchCalls = useCallback(async (isBackground = false) => {
    if (isFetchingRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    isFetchingRef.current = true;
    if (!isBackground) setIsLoadingCalls(true);

    try {
      const data = await api.getCalls(statusFilter === 'all' ? undefined : statusFilter);
      setCalls(data);
    } catch (err: any) {
      // Gracefully handle transient network switches (e.g. Wi-Fi reconnection) without throwing
      console.warn('Call telemetry sync deferred (network reconnecting):', err?.message);
    } finally {
      if (!isBackground) setIsLoadingCalls(false);
      isFetchingRef.current = false;
    }
  }, [statusFilter]);

  // Initial and filter-change fetch
  useEffect(() => {
    fetchCalls(false);
  }, [fetchCalls]);

  // Sequential, non-overlapping polling when active calls are in-flight
  useEffect(() => {
    const hasActiveCalls = calls.some(
      (c) => c.status === 'Initiated' || c.status === 'Ringing' || c.status === 'In Progress'
    );
    if (!hasActiveCalls) {
      if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
      return;
    }

    let isMounted = true;

    const scheduleNextPoll = () => {
      if (!isMounted) return;
      pollingTimeoutRef.current = setTimeout(async () => {
        if (!isMounted) return;
        await fetchCalls(true);
        if (isMounted) scheduleNextPoll();
      }, 4000);
    };

    scheduleNextPoll();

    return () => {
      isMounted = false;
      if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
    };
  }, [calls, fetchCalls]);

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

  const handleSimulateFailure = async (call: CallRecord) => {
    try {
      await api.simulateCallFailure(call.call_id);
      await fetchCalls();
      setFeedbackMessage({
        type: 'success',
        text: `Simulated carrier rejection / line busy for ${call.call_id}. Status updated to Failed.`
      });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to simulate call failure' });
    }
  };

  const handleRefreshStatus = async (callId: string) => {
    setIsRefreshingStatus(true);
    try {
      const updated = await api.refreshCallStatus(callId);
      if (selectedCall && selectedCall.call_id === callId) {
        setSelectedCall(updated);
      }
      await fetchCalls();
      setFeedbackMessage({
        type: 'success',
        text: `Live status refreshed for ${callId} (${updated.status} / ${updated.disposition})`
      });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to refresh call status' });
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'ringing':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/40 animate-pulse';
      case 'initiated':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'failed':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-white/5 text-slate-300 border-white/10';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">AI Voice Screening Assistant</h2>
          <p className="text-sm text-slate-400 mt-1">
            Dispatch outbound autonomous screening calls via Hunar Voice API and monitor real-time transcripts, scoring, and telemetry.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCalls}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCalls ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          )}
          <div className="flex-1">{feedbackMessage.text}</div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid: Dispatch Form + Preloads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Screening form */}
        <div className="lg:col-span-2 bg-[#121212] rounded-xl border border-white/10 shadow-xl p-6">
          <div className="flex items-center gap-2 pb-4 border-b border-white/10 mb-5">
            <PhoneCall className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-500">Initiate Outbound Voice Screening</h3>
          </div>

          <form onSubmit={handleTriggerCall} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="candidate-name" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Candidate Name *
                </label>
                <input
                  id="candidate-name"
                  name="candidate_name"
                  type="text"
                  autoComplete="name"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g. Rachel Foster"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-all"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone-number" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Phone Number (E.164) *
                </label>
                <input
                  id="phone-number"
                  name="phone_number"
                  type="tel"
                  autoComplete="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1-415-555-0182"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-all font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="target-position" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Target Position *
              </label>
              <input
                id="target-position"
                name="position"
                type="text"
                autoComplete="organization-title"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. Senior Backend Engineer (FastAPI / Systems)"
                className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-all"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="custom-prompt" className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Custom AI Voice Prompt / Screening Directives
                </label>
                <span className="text-[10px] text-slate-500 uppercase">Optional</span>
              </div>
              <textarea
                id="custom-prompt"
                name="custom_prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                placeholder="Specify required skills to probe, architectural trade-offs, salary alignment check, and availability..."
                className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-all leading-relaxed"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Encrypted bearer authentication active</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-lg transition-all shadow-md shadow-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Quick Test Preloads */}
        <div className="bg-[#121212] rounded-xl border border-white/10 shadow-xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Pre-configured Test Profiles</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
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
              className="w-full text-left p-3 rounded-lg border border-white/10 bg-black/30 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-xs group"
            >
              <div className="font-semibold text-white group-hover:text-amber-400 flex items-center justify-between">
                <span>Maya Lin</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-slate-400 mt-0.5">Staff Python Backend Architect</div>
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
              className="w-full text-left p-3 rounded-lg border border-white/10 bg-black/30 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-xs group"
            >
              <div className="font-semibold text-white group-hover:text-amber-400 flex items-center justify-between">
                <span>Tariq Hameed</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-slate-400 mt-0.5">Senior Cloud Platform Engineer</div>
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
              className="w-full text-left p-3 rounded-lg border border-white/10 bg-black/30 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-xs group"
            >
              <div className="font-semibold text-white group-hover:text-amber-400 flex items-center justify-between">
                <span>Claire Dubois</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-slate-400 mt-0.5">Voice AI Telephony Specialist</div>
            </button>
          </div>
        </div>
      </div>

      {/* Live Status & History Table */}
      <div className="bg-[#121212] rounded-xl border border-white/10 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-500">Live Voice Screening Records</h3>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-white/5 text-slate-300 border border-white/10">
              {calls.length} logged
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <label htmlFor="call-status-filter" className="text-xs text-slate-400">Filter:</label>
            <select
              id="call-status-filter"
              name="call_status_filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-white/10 rounded-lg px-2.5 py-1 bg-black/40 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all" className="bg-[#121212] text-slate-200">All States</option>
              <option value="Completed" className="bg-[#121212] text-slate-200">Completed</option>
              <option value="Ringing" className="bg-[#121212] text-slate-200">Ringing</option>
              <option value="Initiated" className="bg-[#121212] text-slate-200">Initiated</option>
              <option value="Failed" className="bg-[#121212] text-slate-200">Failed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className="px-6 py-3">Candidate / Role</th>
                <th className="px-6 py-3">Call ID / Status</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-6 py-3">AI Evaluation</th>
                <th className="px-6 py-3">Disposition</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {calls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No voice calls found matching criteria. Trigger a new screening call above.
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <tr key={call.call_id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{call.candidate_name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{call.phone_number}</div>
                      <div className="text-xs text-slate-400 mt-1">{call.position}</div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(
                          call.status
                        )}`}
                      >
                        {call.status}
                      </span>
                      <div className="text-[11px] text-slate-500 font-mono mt-1">{call.call_id}</div>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-400">
                      <div className="flex items-center gap-1 font-mono text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{call.duration_seconds > 0 ? `${call.duration_seconds}s` : '—'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {call.status === 'Completed' ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Score:</span>
                            <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                              {call.overall_score}%
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs" title={call.answers_summary || ''}>
                            {call.answers_summary || 'Analysis complete'}
                          </div>
                        </div>
                      ) : call.status === 'Failed' ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>Evaluation Aborted</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs" title={call.answers_summary || call.transcript || 'Carrier rejected / Line busy'}>
                            {call.answers_summary || 'Carrier rejected / Unreachable'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">In progress...</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${
                          call.disposition === 'Interested'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : call.disposition === 'Not Interested'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : call.disposition === 'Failed' || call.disposition === 'Aborted' || call.disposition === 'Unreachable' || call.status === 'Failed'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-white/5 text-slate-400 border-white/10'
                        }`}
                      >
                        {call.status === 'Failed' && call.disposition === 'Pending' ? 'Failed' : call.disposition}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedCall(call)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Transcript</span>
                      </button>

                      <button
                        onClick={() => handleRefreshStatus(call.call_id)}
                        disabled={isRefreshingStatus}
                        title="Poll Hunar API for live call status"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Refresh</span>
                      </button>

                      {call.status !== 'Completed' && call.status !== 'Failed' && (
                        <>
                          <button
                            onClick={() => handleSimulateWebhook(call)}
                            disabled={isSimulatingWebhook}
                            title="Simulate Hunar Webhook callback for test verification"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Complete Webhook</span>
                          </button>

                          <button
                            onClick={() => handleSimulateFailure(call)}
                            title="Simulate Carrier Call Drop or Busy / Failed state"
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                          >
                            <PhoneOff className="w-3 h-3" />
                            <span>Fail</span>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Full Transcript & Voice Evaluation Details */}
      {selectedCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-200">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Voice Screening Transcript & Evaluation
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedCall.candidate_name} • {selectedCall.position} ({selectedCall.call_id})
                </p>
              </div>
              <button
                onClick={() => setSelectedCall(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Metrics bar */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-black/40 rounded-xl border border-white/10 text-center text-xs">
                <div>
                  <div className="text-slate-400">Overall Match</div>
                  <div className="text-base font-semibold text-emerald-400 mt-0.5 font-mono">
                    {selectedCall.overall_score > 0 ? `${selectedCall.overall_score}%` : 'Pending'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Candidate Interest</div>
                  <div className="text-base font-semibold text-amber-400 mt-0.5 font-mono">
                    {selectedCall.interest_score > 0 ? `${selectedCall.interest_score}%` : 'Pending'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Call Duration</div>
                  <div className="text-base font-semibold text-slate-200 mt-0.5 font-mono">
                    {selectedCall.duration_seconds}s
                  </div>
                </div>
              </div>

              {/* Notice indicator if upstream warning/notice */}
              {selectedCall._notice && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-300">Telephony Gateway Notice: </span>
                    <span className="text-slate-300">{selectedCall._notice}</span>
                  </div>
                </div>
              )}

              {/* Summary */}
              {selectedCall.answers_summary && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1">
                    AI Analysis Summary
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-black/40 p-3 rounded-lg border border-white/10">
                    {selectedCall.answers_summary}
                  </p>
                </div>
              )}

              {/* Audio URL indicator if available */}
              {selectedCall.audio_recording_url && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between text-xs text-blue-300">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-blue-400" />
                    <span>Audio Recording available on Hunar Cloud Gateway</span>
                  </div>
                  <a
                    href={selectedCall.audio_recording_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline hover:text-white"
                  >
                    Listen Audio
                  </a>
                </div>
              )}

              {/* Full Transcript */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Dialogue Transcript
                </h4>
                <div className="p-4 bg-black text-amber-400/90 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto border border-white/10">
                  {selectedCall.transcript || 'No transcript text available for this call.'}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-white/10 bg-black/20 flex items-center justify-between">
              <button
                onClick={() => handleRefreshStatus(selectedCall.call_id)}
                disabled={isRefreshingStatus}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStatus ? 'animate-spin' : ''}`} />
                <span>{isRefreshingStatus ? 'Polling Hunar...' : 'Refresh Status'}</span>
              </button>
              <button
                onClick={() => setSelectedCall(null)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition-all"
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
