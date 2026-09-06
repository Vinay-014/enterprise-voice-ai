import type { Metadata } from "next";
import Link from "next/link";
import { Radio, PhoneCall, Users, Activity } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Enterprise Voice AI Platform",
  description: "Autonomous voice AI screening, candidate matching reachout, and smartphone-free attendance tracking via Hunar Voice API.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased selection:bg-zinc-900 selection:text-white">
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-xs">
                  <Radio className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base tracking-tight text-zinc-950">
                      Enterprise Voice AI Platform
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                      Production v1.0
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 hidden sm:block">
                    Hunar Voice Telephony • NLP Skill Parsing • Landline IVR Zero-Smartphone Edge
                  </div>
                </div>
              </Link>

              <nav className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl border border-zinc-200">
                <Link
                  href="/hiring"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 hover:text-zinc-950 hover:bg-white/80 transition-all"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>AI Hiring</span>
                </Link>

                <Link
                  href="/reachout"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 hover:text-zinc-950 hover:bg-white/80 transition-all"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>People Reachout</span>
                </Link>

                <Link
                  href="/attendance"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 hover:text-zinc-950 hover:bg-white/80 transition-all"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Attendance</span>
                </Link>
              </nav>

              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-zinc-700">Hunar Engine Online</span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
