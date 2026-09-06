"use client";

import React, { useState } from 'react';
import { HiringAssistant } from '@/components/HiringAssistant';
import { PeopleSearchReachout } from '@/components/PeopleSearchReachout';
import { AttendanceSystem } from '@/components/AttendanceSystem';
import { PhoneCall, Users, Activity } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'hiring' | 'reachout' | 'attendance'>('hiring');

  return (
    <div className="space-y-6">
      {/* Sub-navigation pill */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
        <div className="flex items-center gap-2 p-1 bg-zinc-100 rounded-xl border border-zinc-200">
          <button
            onClick={() => setActiveTab('hiring')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'hiring'
                ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>AI Hiring Assistant</span>
          </button>

          <button
            onClick={() => setActiveTab('reachout')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'reachout'
                ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>People Search & Reachout</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'attendance'
                ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200/80'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Smartphone-Free Attendance</span>
          </button>
        </div>
      </div>

      <div>
        {activeTab === 'hiring' && <HiringAssistant />}
        {activeTab === 'reachout' && <PeopleSearchReachout />}
        {activeTab === 'attendance' && <AttendanceSystem />}
      </div>
    </div>
  );
}
