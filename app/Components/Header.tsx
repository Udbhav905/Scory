"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import AuthModal from "./AuthModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TickerMatch {
  id: number;
  team1: string;
  team2: string;
  score: string;
  overs: string;
  live: boolean;
}

interface InningsRow {
  innings_number: number;
  total_runs: number;
  total_wickets: number;
  overs: string;
}

interface DashboardMatch {
  id: number;
  team_a_name: string;
  team_b_name: string;
  status: string;
  innings?: InningsRow[];
}
export const dynamic = "force-dynamic";

// (your existing imports and code, wrapped in try-catch)
// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatScore(innings: InningsRow[]): string | null {
  if (!innings || innings.length === 0) return null;
  const last = innings.reduce((prev, curr) => (curr.innings_number > prev.innings_number ? curr : prev));
  return `${last.total_runs}/${last.total_wickets}`;
}

function formatOvers(innings: InningsRow[]): string | null {
  if (!innings || innings.length === 0) return null;
  const last = innings.reduce((prev, curr) => (curr.innings_number > prev.innings_number ? curr : prev));
  return last.overs ?? null;
}

// ─── Nav Link ─────────────────────────────────────────────────────────────────

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={`relative text-[11px] font-black uppercase tracking-[0.2em] transition-colors duration-200 px-1 py-0.5 ${active ? "text-[#B5E18B]" : "text-[#8090A4] hover:text-[#E0E8F0]"}`}>
      {label}
      {active && <span className="absolute -bottom-px left-0 right-0 h-px bg-[#B5E18B] rounded-full" />}
    </Link>
  );
}

// ─── Ticker Item ──────────────────────────────────────────────────────────────

function TickerItem({ match }: { match: TickerMatch }) {
  return (
    <Link href={`/match/${match.id}`} className="flex items-center gap-2 px-6 font-['Barlow_Condensed',sans-serif] text-[11px] font-semibold tracking-wide text-[#8090A4] uppercase border-r border-white/[0.05] hover:text-[#B5E18B] transition-colors whitespace-nowrap shrink-0">
      <span className="text-[#E0E8F0] font-bold">{match.team1}</span>
      <span className="text-[#4a5568]">vs</span>
      <span className="text-[#E0E8F0] font-bold">{match.team2}</span>
      <span className="text-[#B5E18B] font-bold">{match.score}</span>
      {match.overs && <span className="text-[#8090A4]">({match.overs})</span>}
      {match.live && (
        <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-[0.15em] text-red-400 border border-red-500/40 px-1.5 py-px rounded-sm">
          <span className="w-1 h-1 bg-red-400 rounded-full animate-pulse" />
          LIVE
        </span>
      )}
    </Link>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [tickerItems, setTickerItems] = useState<TickerMatch[]>([]);
  const [tickerLoading, setTickerLoading] = useState(true);

  // ── Ticker data ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchTickerData() {
      try {
        const res = await fetch("/api/public/dashboard?query=");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();

        const matches: DashboardMatch[] = [...(data.liveMatches ?? []), ...(data.recentMatches ?? [])].slice(0, 12);

        const valid = matches.map((match) => {
          const innings = match.innings ?? [];
          const score = formatScore(innings);
          const overs = formatOvers(innings);
          const isLive = match.status === "live" || match.status === "innings_1_complete" || match.status === "innings_2_live";
          return {
            id: match.id,
            team1: match.team_a_name,
            team2: match.team_b_name,
            score: score ?? (isLive ? "0/0" : "Completed"),
            overs: overs ? `${overs} ov` : "",
            live: isLive,
          } satisfies TickerMatch;
        });

        setTickerItems(valid);
      } catch {
        // silent — empty ticker
      } finally {
        setTickerLoading(false);
      }
    }
    fetchTickerData();
  }, []);

  // ── Close dropdown on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        // ✅ Do NOT close if the click is on a link inside the dropdown
        // This prevents navigation from being blocked
        const target = e.target as HTMLElement;
        const isLink = target.closest("a[href]");
        if (!isLink) {
          setDropdownOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Close mobile menu on route change ───────────────────────────────────
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const getUserInitials = (): string => {
    if (!session?.user?.name) return "U";
    return session.user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayedItems: TickerMatch[] = tickerLoading || tickerItems.length === 0 ? [] : [...tickerItems, ...tickerItems];

  // Navigation links (optional, uncomment if needed)
  

  return (
    <>
      {/* ── Keyframes ─────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes bar-sweep {
          0%   { transform: translateX(-100%); opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes ticker-move {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker { animation: ticker-move 32s linear infinite; }
        .animate-ticker:hover { animation-play-state: paused; }
      `}</style>

      <header className="sticky top-0 z-50 font-sans">
        {/* ── Main bar ──────────────────────────────────────────────────────── */}
        <div className="relative bg-[#080a0f]/95 backdrop-blur-2xl border-b border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {/* Scan-line texture */}
          <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(255,255,255,0.008)_3px,rgba(255,255,255,0.008)_4px)]" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
            {/* ── Logo ──────────────────────────────────────────────────────── */}
            <Link href="/" className="group flex items-center gap-3 shrink-0">
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                <div className="w-full h-full flex items-center justify-center transition-transform duration-500 [clip-path:polygon(50%_0%,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)] bg-gradient-to-br from-[#28396C] to-[#3F5F9E] group-hover:scale-105 group-hover:rotate-12">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 text-[#F0FFC2]">
                    <path d="M4.5 19.5l7.5-7.5 3 3-7.5 7.5H4.5v-3z" />
                    <path d="M19 3a2 2 0 0 1 2 2c0 .55-.22 1.05-.59 1.41L13 13.83l-2.83-2.83 7.42-7.41C17.95 3.22 18.45 3 19 3z" />
                  </svg>
                </div>
                {/* Corner accents */}
                <div className="absolute -top-0.5 -left-0.5 w-2 h-0.5 bg-[#B5E18B] opacity-0 group-hover:opacity-70 transition-opacity duration-300" />
                <div className="absolute -top-0.5 -left-0.5 w-0.5 h-2 bg-[#B5E18B] opacity-0 group-hover:opacity-70 transition-opacity duration-300" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-0.5 bg-[#3F5F9E] opacity-0 group-hover:opacity-70 transition-opacity duration-300" />
                <div className="absolute -bottom-0.5 -right-0.5 w-0.5 h-2 bg-[#3F5F9E] opacity-0 group-hover:opacity-70 transition-opacity duration-300" />
              </div>
              <div className="flex flex-col leading-none">
                <div className="font-['Barlow_Condensed',sans-serif] font-black text-2xl sm:text-3xl tracking-wide text-[#F0F0F0] uppercase leading-none">
                  Sc<span className="text-[#B5E18B]">o</span>ry
                </div>
                <div className="font-['Barlow_Condensed',sans-serif] font-semibold text-[9px] tracking-[0.35em] text-[#8090A4] uppercase">Live Cricket</div>
              </div>
            </Link>

            {/* ── Desktop nav links ──────────────────────────────────────────── */}
            {/* (Uncomment if you want visible nav links) */}
            {/* <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  active={pathname === link.href}
                />
              ))}
            </div> */}

            {/* ── Right controls ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Divider */}
              <div className="hidden md:block w-px h-5 bg-white/10" />

              {status === "authenticated" ? (
                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setDropdownOpen((v) => !v)} className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-white/5 transition-colors duration-200" aria-expanded={dropdownOpen} aria-haspopup="true">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B5E18B] to-[#6aab2e] flex items-center justify-center text-[#1F2A44] font-black text-sm shadow-lg shadow-[#B5E18B]/20">{getUserInitials()}</div>
                    <span className="hidden sm:inline text-[#E0E8F0] text-sm font-semibold">{session.user?.name?.split(" ")[0]}</span>
                    <svg className={`w-3.5 h-3.5 text-[#4a5568] transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown — z-[200] ensures it layers above everything */}
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#0d1117] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 py-1.5 z-[200] overflow-hidden">
                      {/* User info */}
                      <div className="px-4 py-2.5 border-b border-white/[0.06]">
                        <p className="text-[11px] font-black text-[#e2e8f0] uppercase tracking-wider truncate">{session.user?.name}</p>
                        <p className="text-[10px] text-[#4a5568] truncate mt-0.5">{session.user?.email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/profile"
                          onClick={() => {
                            // Close dropdown after navigation starts
                            setTimeout(() => setDropdownOpen(false), 0);
                          }}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#8090A4] hover:text-[#E0E8F0] hover:bg-white/5 transition-colors duration-150"
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-[11px] font-black uppercase tracking-wider">Profile</span>
                        </Link>

                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            signOut({ callbackUrl: "/" });
                          }}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#8090A4] hover:text-red-400 hover:bg-red-500/5 transition-colors duration-150"
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span className="text-[11px] font-black uppercase tracking-wider">Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => setModalOpen(true)} className="flex items-center px-4 h-9 rounded-xl bg-transparent text-[#8090A4] font-['Barlow_Condensed',sans-serif] font-black text-xs sm:text-sm tracking-[0.2em] uppercase border border-white/[0.08] transition-all duration-200 hover:text-white hover:border-[#B5E18B]/50 hover:bg-[#B5E18B]/5 hover:shadow-[0_0_16px_rgba(181,225,139,0.1)] active:scale-95">
                  Login
                </button>
              )}

              {/* Mobile hamburger */}
              <button onClick={() => setMobileMenuOpen((v) => !v)} className="md:hidden w-9 h-9 rounded-xl bg-white/5 border border-white/[0.06] flex items-center justify-center text-[#8090A4] hover:text-white hover:bg-white/10 transition-all duration-200" aria-label="Toggle menu">
                {mobileMenuOpen ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* ── Animated sweep bar ────────────────────────────────────────────── */}
          <div className="relative h-[1.5px] bg-[#0d1422] overflow-hidden">
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-[#B5E18B]/70 to-transparent" style={{ animation: "bar-sweep 3.5s ease-in-out infinite" }} />
          </div>
        </div>

        {/* ── Mobile nav drawer ──────────────────────────────────────────────── */}
        

        {/* ── Score ticker ───────────────────────────────────────────────────── */}
        <div className="hidden sm:flex h-7 bg-[#0a0d14] border-b border-white/[0.04] items-center overflow-hidden">
          {/* Label pill */}
          <div className="shrink-0 flex items-center gap-1.5 px-4 h-full bg-[#131d35] font-['Barlow_Condensed',sans-serif] font-bold text-[10px] tracking-[0.25em] text-[#B5E18B] uppercase border-r border-[#1e2d50]">
            <span className="w-1.5 h-1.5 bg-[#B5E18B] rounded-full animate-pulse" />
            SCORES
          </div>

          {/* Ticker content */}
          <div className="flex-1 overflow-hidden relative">
            {tickerLoading ? (
              <div className="flex items-center justify-center h-7">
                <div className="w-3 h-3 border-2 border-[#B5E18B]/60 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : displayedItems.length === 0 ? (
              <span className="px-4 text-[#4a5568] text-[10px] uppercase tracking-wider font-semibold">No recent matches</span>
            ) : (
              <div className="flex items-center animate-ticker">
                {displayedItems.map((match, idx) => (
                  <TickerItem key={`${match.id}-${idx}`} match={match} />
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
