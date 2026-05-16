"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Match {
  id: number;
  team_a_name: string;
  team_a_logo_url: string;
  team_b_name: string;
  team_b_logo_url: string;
  venue: string;
  match_date: string;
  status: string;
  tournament_name: string;
}

interface Tournament {
  id: number;
  name: string;
  logo_url: string;
  venue: string;
  status: string;
}

type Tab = "live" | "recent" | "tournaments";
type Theme = "dark" | "light";

// ─── Theme tokens ─────────────────────────────────────────────────────────────

const tokens = {
  dark: {
    bg: "bg-[#0a0c12]",
    surface: "bg-[#111520]/80 backdrop-blur-xl",
    border: "border-white/5",
    borderHover: "hover:border-[#3b6fd4]/30",
    borderDashed: "border-white/10",
    text: "text-[#e8eaf0]",
    textMuted: "text-[#7a8099]",
    textAccent: "text-[#3b6fd4]",
    textDim: "text-white/20",
    pill: "bg-[#1a1f2e] border-white/10 text-[#7a8099]",
    pillAccent: "bg-[#3b6fd4]/15 text-[#3b6fd4] border-[#3b6fd4]/25",
    tabBg: "bg-[#111520]/60 border-white/8",
    tabActive: "bg-[#3b6fd4] text-white",
    tabInactive: "text-[#7a8099] hover:text-[#e8eaf0]",
    heroBadge: "bg-[#1a1f2e]/60 border-white/8 text-[#7a8099]",
    heroGrad: "from-[#3b6fd4]/15",
    searchBg: "bg-[#111520]/60 border-white/8 focus:border-[#3b6fd4]/60 text-[#e8eaf0] placeholder:text-[#7a8099]/50",
    searchBtn: "bg-[#3b6fd4] text-white hover:bg-[#5a8de8] shadow-[#3b6fd4]/20",
    avatarBg: "bg-[#1a1f2e] border-white/8",
    footer: "bg-[#0d1018] border-white/5",
    footerLogo: "text-white/8",
    toggleBg: "bg-[#1a1f2e] border-white/10",
    cardHover: "hover:bg-[#3b6fd4]/5",
    skeletonBase: "bg-white/5",
    skeletonHigh: "bg-white/8",
    divider: "from-white/8",
    sectionLabel: "text-[#7a8099]",
    countLive: "bg-red-500/10 text-red-400 border-red-500/20",
    countRecent: "bg-[#3b6fd4]/10 text-[#3b6fd4] border-[#3b6fd4]/20",
    countTourneys: "bg-white/6 text-[#7a8099] border-white/10",
    emptyWrap: "bg-[#1a1f2e]/60 border-white/8",
    statusActive: "bg-red-500/10 text-red-400 border-red-500/20",
    statusDefault: "bg-[#3b6fd4]/10 text-[#3b6fd4] border-[#3b6fd4]/20",
  },
  light: {
    bg: "bg-[#f0f2f8]",
    surface: "bg-white/80 backdrop-blur-xl",
    border: "border-slate-200/80",
    borderHover: "hover:border-blue-400/50",
    borderDashed: "border-slate-300",
    text: "text-[#1a1f36]",
    textMuted: "text-[#64748b]",
    textAccent: "text-[#2563eb]",
    textDim: "text-slate-900/15",
    pill: "bg-slate-100 border-slate-200 text-[#64748b]",
    pillAccent: "bg-blue-50 text-[#2563eb] border-blue-200",
    tabBg: "bg-white/70 border-slate-200",
    tabActive: "bg-[#2563eb] text-white",
    tabInactive: "text-[#64748b] hover:text-[#1a1f36]",
    heroBadge: "bg-white/80 border-slate-200 text-[#64748b]",
    heroGrad: "from-blue-100/50",
    searchBg: "bg-white border-slate-200 focus:border-blue-400 text-[#1a1f36] placeholder:text-slate-400",
    searchBtn: "bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-blue-200",
    avatarBg: "bg-slate-100 border-slate-200",
    footer: "bg-slate-100 border-slate-200",
    footerLogo: "text-slate-900/10",
    toggleBg: "bg-white border-slate-200",
    cardHover: "hover:bg-blue-50/50",
    skeletonBase: "bg-slate-200/60",
    skeletonHigh: "bg-slate-200/80",
    divider: "from-slate-300/50",
    sectionLabel: "text-[#64748b]",
    countLive: "bg-red-50 text-red-500 border-red-200",
    countRecent: "bg-blue-50 text-[#2563eb] border-blue-200",
    countTourneys: "bg-slate-100 text-[#64748b] border-slate-200",
    emptyWrap: "bg-slate-100 border-slate-200",
    statusActive: "bg-green-50 text-green-600 border-green-200",
    statusDefault: "bg-blue-50 text-[#2563eb] border-blue-200",
  },
} as const;

type T = (typeof tokens)[Theme];
// ─── useTheme hook ────────────────────────────────────────────────────────────

function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");       // Always "dark" on the server
  const [mounted, setMounted] = useState(false);
  const [fading, setFading] = useState(false);

  // Read from localStorage only after hydration
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
    }
  }, []);

  const toggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    setFading(true);
    setTimeout(() => setFading(false), 160);
  };

  // Prevent rendering the toggle button with the wrong theme before mounting
  return { theme, toggle, fading, t: tokens[theme], mounted };
}

// ─── Floating Theme Toggle (bottom-right, non-fixed) ─────────────────────────

function FloatingThemeToggle({ theme, toggle, t }: { theme: Theme; toggle: () => void; t: T }) {
   return (
    <motion.button onClick={toggle} /* ... */>
      <AnimatePresence mode="wait">
        {theme === "dark" ? (
          <motion.svg key="moon" /* ... */ />
        ) : (
          <motion.svg key="sun" /* ... */ />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ─── TeamAvatar ───────────────────────────────────────────────────────────────

function TeamAvatar({ name, logoUrl, size = "md", t }: { name: string; logoUrl?: string; size?: "sm" | "md" | "lg"; t: T }) {
  const sz = { sm: "w-9 h-9 text-sm", md: "w-12 h-12 text-base", lg: "w-16 h-16 text-xl" };
  return (
    <div className={`${sz[size]} rounded-xl ${t.avatarBg} border flex items-center justify-center overflow-hidden shrink-0 transition-all duration-500`}>
      {logoUrl && (
        <img
          src={logoUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
          }}
        />
      )}
      <span className={`font-black ${t.textAccent} ${logoUrl ? "hidden" : ""}`}>{name?.[0] ?? "?"}</span>
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function LiveBadge({ t }: { t: T }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-500 ${t.countLive}`}>
      <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
      LIVE
    </span>
  );
}

function StatusBadge({ status, t }: { status: string; t: T }) {
  return <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all duration-500 ${status === "active" ? t.statusActive : t.statusDefault}`}>{status || "upcoming"}</span>;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard({ t }: { t: T }) {
  return (
    <div className={`${t.surface} rounded-2xl p-5 border ${t.border} space-y-3 animate-pulse transition-all duration-500`}>
      <div className={`h-3 w-1/3 ${t.skeletonBase} rounded-full`} />
      <div className="flex gap-4 items-center">
        <div className={`w-12 h-12 rounded-xl ${t.skeletonBase}`} />
        <div className="flex-1 space-y-2">
          <div className={`h-3 w-2/3 ${t.skeletonBase} rounded-full`} />
          <div className={`h-2 w-1/2 ${t.skeletonBase} rounded-full`} />
        </div>
      </div>
      <div className={`h-2 w-full ${t.skeletonHigh} rounded-full`} />
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ message, t }: { message: string; t: T }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className={`w-14 h-14 rounded-2xl ${t.emptyWrap} border flex items-center justify-center transition-all duration-500`}>
        <svg className={`w-6 h-6 ${t.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p className={`${t.textMuted} text-xs font-black uppercase tracking-[0.3em]`}>{message}</p>
    </div>
  );
}

// ─── LiveMatchCard ────────────────────────────────────────────────────────────

function LiveMatchCard({ match, t }: { match: Match; t: T }) {
  return (
    <Link href={`/match/${match.id}`} className="block h-full">
      <motion.div whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} className={`${t.surface} p-5 rounded-2xl border ${t.border} ${t.borderHover} ${t.cardHover} shadow-sm cursor-pointer h-full transition-all duration-300`}>
        <div className="flex items-start justify-between gap-2 mb-5">
          <span className={`text-[9px] font-black ${t.textAccent} uppercase tracking-widest leading-tight line-clamp-2 flex-1`}>{match.tournament_name || "Major Series"}</span>
          <LiveBadge t={t} />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <TeamAvatar name={match.team_a_name} logoUrl={match.team_a_logo_url} size="md" t={t} />
            <span className={`text-xs font-black uppercase tracking-tight ${t.text} text-center w-full truncate`}>{match.team_a_name}</span>
          </div>
          <span className={`text-xs font-black ${t.textDim} uppercase shrink-0`}>VS</span>
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <TeamAvatar name={match.team_b_name} logoUrl={match.team_b_logo_url} size="md" t={t} />
            <span className={`text-xs font-black uppercase tracking-tight ${t.text} text-center w-full truncate`}>{match.team_b_name}</span>
          </div>
        </div>
        <div className={`mt-5 pt-4 border-t ${t.border} flex items-center justify-between gap-2`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <svg className={`w-3 h-3 ${t.textMuted} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className={`text-[9px] ${t.textMuted} font-bold uppercase tracking-wider truncate`}>{match.venue}</span>
          </div>
          <span className={`${t.textAccent} text-sm shrink-0 font-black`}>→</span>
        </div>
      </motion.div>
    </Link>
  );
}

// ─── RecentMatchRow ───────────────────────────────────────────────────────────

function RecentMatchRow({ match, t }: { match: Match; t: T }) {
  return (
    <Link href={`/match/${match.id}`} className="block">
      <motion.div whileHover={{ x: 4 }} whileTap={{ scale: 0.99 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className={`${t.surface} p-4 rounded-xl border ${t.border} ${t.borderHover} ${t.cardHover} transition-all duration-300 cursor-pointer`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex sm:hidden items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${t.pill}`}>{match.tournament_name || "Tournament"}</span>
            <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${t.pillAccent}`}>Finished</span>
          </div>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <TeamAvatar name={match.team_a_name} logoUrl={match.team_a_logo_url} size="sm" t={t} />
              <span className={`text-sm font-black uppercase tracking-tight ${t.text} truncate`}>{match.team_a_name}</span>
            </div>
            <span className={`${t.textDim} font-black text-[10px] uppercase shrink-0`}>VS</span>
            <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end sm:justify-start">
              <TeamAvatar name={match.team_b_name} logoUrl={match.team_b_logo_url} size="sm" t={t} />
              <span className={`text-sm font-black uppercase tracking-tight ${t.text} truncate`}>{match.team_b_name}</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${t.pill}`}>{match.tournament_name || "Tournament"}</span>
            <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${t.pillAccent}`}>Finished</span>
          </div>
          <span className={`hidden sm:block ${t.textMuted} text-sm font-black shrink-0`}>→</span>
        </div>
      </motion.div>
    </Link>
  );
}

// ─── TournamentCard ───────────────────────────────────────────────────────────
// Find the TournamentCard component and replace it with:

function TournamentCard({ tournament, t }: { tournament: Tournament; t: T }) {
  return (
    <Link href={`/tournament/${tournament.id}`} className="block">
      <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} className={`${t.surface} p-4 rounded-xl border ${t.border} ${t.borderHover} ${t.cardHover} transition-all duration-300 cursor-pointer`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl ${t.avatarBg} border flex items-center justify-center overflow-hidden shrink-0 transition-all duration-500`}>{tournament.logo_url ? <img src={tournament.logo_url} alt={tournament.name} className="w-full h-full object-cover" /> : <span className={`text-lg font-black ${t.textAccent}`}>T</span>}</div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-xs font-black uppercase tracking-widest ${t.text} truncate transition-colors duration-500`}>{tournament.name}</h3>
            {tournament.venue && <p className={`text-[9px] ${t.textMuted} font-bold uppercase truncate mt-0.5`}>{tournament.venue}</p>}
          </div>
          <StatusBadge status={tournament.status} t={t} />
        </div>
      </motion.div>
    </Link>
  );
}

// ─── TabBar ───────────────────────────────────────────────────────────────────

function TabBar({ active, onChange, counts, t }: { active: Tab; onChange: (tab: Tab) => void; counts: Record<Tab, number>; t: T }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "live", label: "Live" },
    { key: "recent", label: "Recent" },
    { key: "tournaments", label: "Tourneys" },
  ];
  return (
    <div className={`flex lg:hidden ... ${t.tabBg}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 ... ${active === tab.key ? t.tabActive : t.tabInactive}`}
        >
          {tab.label}
          {tab.key === "live" && counts.live > 0 && (
            <span className="absolute -top-1 -right-1 ...">{counts.live}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── SectionHeading ───────────────────────────────────────────────────────────

function SectionHeading({ label, count, countClass, t, isLive = false }: { label: string; count?: number; countClass?: string; t: T; isLive?: boolean }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="flex items-center gap-2.5">
        {isLive && <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />}
        <h2 className={`text-[10px] font-black uppercase tracking-[0.4em] transition-colors duration-500 ${t.sectionLabel}`}>{label}</h2>
        {count !== undefined && count > 0 && <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border transition-all duration-500 ${countClass}`}>{count}</span>}
      </div>
      <div className={`h-px flex-1 bg-gradient-to-r ${t.divider} to-transparent`} />
    </div>
  );
}

// ─── Dashboard (no fixed navbar, content starts below layout header) ─────────

export default function Dashboard() {
  const { theme, toggle, fading, t } = useTheme();

  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  // ✅ Initial activeTab based on screen width (one‑time only)
//   const [activeTab, setActiveTab] = useState<Tab>(() => {
//     if (typeof window !== "undefined" && window.innerWidth < 1024) return "recent";
//     return "live";
//   });
// Default to "live" on the server – ensures server/client HTML match
const [activeTab, setActiveTab] = useState<Tab>("live");
const [isMounted, setIsMounted] = useState(false);

// After the component mounts (client only), decide the correct tab
useEffect(() => {
  setIsMounted(true);
  // Check screen width only on the client
  if (window.innerWidth < 1024) {
    setActiveTab("recent");
  }
}, []);
  const searchRef = useRef<HTMLInputElement>(null);

  // ✅ No automatic switching on resize – user can now click any tab on any screen
  // The original useEffect that forced tab changes has been removed.

  const fetchData = useCallback(async (query = "") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/dashboard?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("fail");
      const data = await res.json();
      setLiveMatches(data.liveMatches || []);
      setRecentMatches(data.recentMatches || []);
      setTournaments(data.tournaments || []);
    } catch {
      setError("Could not load dashboard data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(draftSearch);
    fetchData(draftSearch);
  };

  const clearSearch = () => {
    setDraftSearch("");
    setSearchTerm("");
    fetchData("");
    searchRef.current?.focus();
  };

  const counts: Record<Tab, number> = {
    live: liveMatches.length,
    recent: recentMatches.length,
    tournaments: tournaments.length,
  };

  return (
    <motion.div animate={{ opacity: fading ? 0 : 1 }} transition={{ duration: 0.16 }} className={`min-h-screen font-sans transition-colors duration-500 ${t.bg} ${t.text} selection:bg-blue-500 selection:text-white`}>
      {/* Hero section – now with proper top padding (no fixed navbar) */}
      <section className="relative pt-20 sm:pt-24 pb-16 sm:pb-20 px-4 sm:px-6 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-b ${t.heroGrad} to-transparent pointer-events-none transition-all duration-500`} />
        <div className="max-w-3xl mx-auto relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-10">
            <div className={`inline-block px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.35em] mb-5 transition-all duration-500 ${t.heroBadge}`}>Next-Gen Cricket Tracking</div>
            <h1 className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase italic mb-6 leading-none transition-colors duration-500 ${t.text}`}>
              FIND YOUR <span className={`transition-colors duration-500 ${t.textAccent}`}>MATCH</span>
            </h1>
          </motion.div>

          <form onSubmit={handleSearch} className="relative group max-w-2xl mx-auto">
            <input ref={searchRef} type="text" placeholder="Search teams, tournaments or venues…" value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)} className={`w-full border-2 rounded-2xl py-4 sm:py-5 pl-12 pr-28 sm:pr-32 focus:outline-none focus:ring-4 focus:ring-blue-400/15 transition-all duration-500 text-base sm:text-lg ${t.searchBg}`} />
            <svg className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none transition-colors duration-500 ${t.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <AnimatePresence>
              {draftSearch && (
                <motion.button type="button" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={clearSearch} className={`absolute right-[5.5rem] sm:right-24 top-1/2 -translate-y-1/2 p-1 ${t.textMuted} hover:opacity-60 transition-opacity`} aria-label="Clear">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>
            <button type="submit" className={`absolute right-2 top-1/2 -translate-y-1/2 px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-lg active:scale-95 transition-all duration-300 ${t.searchBtn}`}>
              SEARCH
            </button>
          </form>

          <AnimatePresence>
            {searchTerm && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${t.textMuted}`}>Results for:</span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${t.pillAccent}`}>{searchTerm}</span>
                <button onClick={clearSearch} className={`${t.textMuted} text-[10px] font-black uppercase tracking-wider hover:opacity-60 transition-opacity`}>
                  ✕ Clear
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-center text-red-500 text-sm">
              {error}
              <button onClick={() => fetchData(searchTerm)} className="ml-3 underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity">
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <TabBar active={activeTab} onChange={setActiveTab} counts={counts} t={t} />

        {/* Live section */}
        <section className={`mb-16 ${activeTab !== "live" ? "hidden lg:block" : ""}`}>
          <SectionHeading label="Live Broadcast" count={!loading ? counts.live : undefined} countClass={t.countLive} t={t} isLive />
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} t={t} />
              ))}
            </div>
          ) : counts.live === 0 ? (
            <div className={`${t.surface} rounded-2xl border border-dashed ${t.borderDashed} transition-all duration-500`}>
              <EmptyState message={searchTerm ? "No live matches match your search" : "No matches currently in progress"} t={t} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {liveMatches.map((match, i) => (
                <motion.div key={match.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="h-full">
                  <LiveMatchCard match={match} t={t} />
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Bottom grid: Recent & Tournaments */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          <div className={`lg:col-span-2 ${activeTab !== "recent" ? "hidden lg:block" : ""}`}>
            <SectionHeading label="Recently Concluded" count={!loading ? counts.recent : undefined} countClass={t.countRecent} t={t} />
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <SkeletonCard key={i} t={t} />
                ))}
              </div>
            ) : counts.recent === 0 ? (
              <div className={`${t.surface} rounded-2xl border border-dashed ${t.borderDashed} transition-all duration-500`}>
                <EmptyState message="No completed matches found" t={t} />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentMatches.map((match, i) => (
                  <motion.div key={match.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <RecentMatchRow match={match} t={t} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className={`${activeTab !== "tournaments" ? "hidden lg:block" : ""}`}>
            <SectionHeading label="Tournaments" count={!loading ? counts.tournaments : undefined} countClass={t.countTourneys} t={t} />
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <SkeletonCard key={i} t={t} />
                ))}
              </div>
            ) : counts.tournaments === 0 ? (
              <div className={`${t.surface} rounded-2xl border border-dashed ${t.borderDashed} transition-all duration-500`}>
                <EmptyState message="No tournaments found" t={t} />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {tournaments.map((tournament, i) => (
                  <motion.div key={tournament.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <TournamentCard tournament={tournament} t={t} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`py-16 border-t text-center transition-all duration-500 ${t.footer}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className={`text-2xl sm:text-3xl font-black tracking-tighter uppercase italic mb-4 select-none transition-colors duration-500 ${t.footerLogo}`}>SCORY</div>
          <p className={`text-[9px] font-black uppercase tracking-[0.6em] opacity-50 transition-colors duration-500 ${t.textMuted}`}>End-to-End Real-Time Analytics Engine Made By UDP</p>
        </div>
      </footer>

      {/* Floating theme toggle – bottom right, does not interfere with layout */}
      <FloatingThemeToggle theme={theme} toggle={toggle} t={t} />
    </motion.div>
  );
}
