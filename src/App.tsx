import React, { useState, useEffect } from 'react';
import { HiringAssistant } from './components/HiringAssistant';
import { PeopleSearchReachout } from './components/PeopleSearchReachout';
import { AttendanceSystem } from './components/AttendanceSystem';
import {
  PhoneCall,
  Users,
  Radio,
  Activity,
  Sparkles,
  Layers,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';

export default function App() {
  // Sync tab with URL path or hash if available
  const getInitialTab = (): 'hiring' | 'reachout' | 'attendance' => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('reachout')) return 'reachout';
      if (path.includes('attendance')) return 'attendance';
      if (path.includes('hiring')) return 'hiring';

      const hash = window.location.hash.toLowerCase();
      if (hash.includes('reachout')) return 'reachout';
      if (hash.includes('attendance')) return 'attendance';
    }
    return 'hiring';
  };

  const [activeSuite, setActiveSuite] = useState<'hiring' | 'reachout' | 'attendance'>(getInitialTab());

  // User-gesture-driven navigation: update history only when user explicitly clicks a tab,
  // preventing Chrome's skippable history intervention on initial page paint
  const handleSelectSuite = (suite: 'hiring' | 'reachout' | 'attendance') => {
    setActiveSuite(suite);
    if (typeof window !== 'undefined' && window.location.pathname !== `/${suite}`) {
      window.history.pushState(null, '', `/${suite}`);
    }
  };

  useEffect(() => {
    const handleUrlChange = () => {
      setActiveSuite(getInitialTab());
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Enterprise App Bar */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/10 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center font-bold text-black text-base shadow-md shadow-amber-500/20">
                H
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base tracking-tight text-white">
                    Hunar AI <span className="text-amber-500/90 font-normal">| Enterprise Talent Suite</span>
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full hidden sm:inline-flex">
                    v1.0 Live
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 hidden sm:block">
                  Hunar Voice Telephony • Autonomous Screening • Smartphone-Free Edge
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10">
              <button
                onClick={() => handleSelectSuite('hiring')}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSuite === 'hiring'
                    ? 'bg-amber-500 text-black shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>AI Hiring Assistant</span>
              </button>

              <button
                onClick={() => handleSelectSuite('reachout')}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSuite === 'reachout'
                    ? 'bg-amber-500 text-black shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>People Search & Reachout</span>
              </button>

              <button
                onClick={() => handleSelectSuite('attendance')}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSuite === 'attendance'
                    ? 'bg-amber-500 text-black shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Smartphone-Free Attendance</span>
              </button>
            </nav>

            {/* Status & User Avatar */}
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>API Operational</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-xs font-semibold text-slate-200">
                SR
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSuite === 'hiring' && <HiringAssistant />}
        {activeSuite === 'reachout' && <PeopleSearchReachout />}
        {activeSuite === 'attendance' && <AttendanceSystem />}
      </main>
    </div>
  );
}
