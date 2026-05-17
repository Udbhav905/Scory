"use client";

import { useEffect, useState, useCallback, useRef, RefObject, FormEvent } from "react";
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
type AvatarSize = "sm" | "md" | "lg";

// ─── Token shape ──────────────────────────────────────────────────────────────

interface ThemeTokens {
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderHover: string;
  borderDashed: string;
  borderGlow: string;
  text: string;
  textMuted: string;
  textAccent: string;
  textDim: string;
  pill: string;
  pillAccent: string;
  tabBg: string;
  tabActive: string;
  tabInactive: string;
  heroBadge: string;
  searchBg: string;
  searchBtn: string;
  avatarBg: string;
  footer: string;
  footerLogo: string;
  toggleBg: string;
  cardHover: string;
  skeletonBase: string;
  skeletonShimmer: string;
  divider: string;
  sectionLabel: string;
  countLive: string;
  countRecent: string;
  countTourneys: string;
  emptyWrap: string;
  statusActive: string;
  statusDefault: string;
  liveGlow: string;
  cardGlow: string;
  gradMesh: string;
  gradMesh2: string;
  navBg: string;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────

const tokens: Record<Theme, ThemeTokens> = {
  dark: {
    bg: "bg-[#080a0f]",
    surface: "bg-[#0d1117]/90 backdrop-blur-2xl",
    surfaceElevated: "bg-[#131720]/95 backdrop-blur-2xl",
    border: "border-white/[0.06]",
    borderHover: "hover:border-indigo-500/40",
    borderDashed: "border-white/10",
    borderGlow: "hover:shadow-[0_0_30px_rgba(99,102,241,0.12)]",
    text: "text-[#e2e8f0]",
    textMuted: "text-[#64748b]",
    textAccent: "text-indigo-400",
    textDim: "text-white/15",
    pill: "bg-white/5 border-white/[0.08] text-[#64748b]",
    pillAccent: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
    tabBg: "bg-[#0d1117]/80 border-white/[0.06]",
    tabActive: "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25",
    tabInactive: "text-[#64748b] hover:text-[#e2e8f0] hover:bg-white/5",
    heroBadge: "bg-white/5 border-white/10 text-[#64748b]",
    searchBg: "bg-[#0d1117] border-white/[0.08] text-[#e2e8f0] placeholder:text-[#3d4a5c]",
    searchBtn: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20",
    avatarBg: "bg-[#131720] border-white/[0.06]",
    footer: "bg-[#080a0f] border-white/5",
    footerLogo: "text-white/[0.06]",
    toggleBg: "bg-[#131720] border-white/10 hover:border-white/20",
    cardHover: "hover:bg-indigo-500/[0.03]",
    skeletonBase: "bg-white/[0.04]",
    skeletonShimmer: "bg-linear-to-r from-transparent via-white/4 to-transparent",
    divider: "from-white/[0.08]",
    sectionLabel: "text-[#64748b]",
    countLive: "bg-red-500/10 text-red-400 border-red-500/20",
    countRecent: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    countTourneys: "bg-white/5 text-[#64748b] border-white/10",
    emptyWrap: "bg-[#0d1117] border-white/[0.06]",
    statusActive: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    statusDefault: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    liveGlow: "shadow-[0_0_40px_rgba(239,68,68,0.08)]",
    cardGlow: "hover:shadow-[0_8px_40px_rgba(99,102,241,0.10)]",
    gradMesh: "bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.12),transparent)]",
    gradMesh2: "bg-[radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(99,102,241,0.06),transparent)]",
    navBg: "bg-[#080a0f]/90 backdrop-blur-2xl border-white/[0.05]",
  },
  light: {
    bg: "bg-[#f5f7ff]",
    surface: "bg-white/90 backdrop-blur-2xl",
    surfaceElevated: "bg-white/95 backdrop-blur-2xl",
    border: "border-slate-200/80",
    borderHover: "hover:border-indigo-400/50",
    borderDashed: "border-slate-300",
    borderGlow: "hover:shadow-[0_0_30px_rgba(99,102,241,0.08)]",
    text: "text-[#0f172a]",
    textMuted: "text-[#64748b]",
    textAccent: "text-indigo-600",
    textDim: "text-slate-900/[0.12]",
    pill: "bg-slate-100 border-slate-200 text-[#64748b]",
    pillAccent: "bg-indigo-50 text-indigo-600 border-indigo-200",
    tabBg: "bg-white/80 border-slate-200",
    tabActive: "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20",
    tabInactive: "text-[#64748b] hover:text-[#0f172a] hover:bg-slate-50",
    heroBadge: "bg-white border-slate-200 text-[#64748b]",
    searchBg: "bg-white border-slate-200 text-[#0f172a] placeholder:text-slate-400",
    searchBtn: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20",
    avatarBg: "bg-slate-50 border-slate-200",
    footer: "bg-slate-100 border-slate-200",
    footerLogo: "text-slate-900/[0.08]",
    toggleBg: "bg-white border-slate-200 hover:border-slate-300",
    cardHover: "hover:bg-indigo-50/40",
    skeletonBase: "bg-slate-100",
    skeletonShimmer: "bg-linear-to-r from-transparent via-white/80 to-transparent",
    divider: "from-slate-200",
    sectionLabel: "text-[#64748b]",
    countLive: "bg-red-50 text-red-500 border-red-100",
    countRecent: "bg-indigo-50 text-indigo-600 border-indigo-100",
    countTourneys: "bg-slate-100 text-[#64748b] border-slate-200",
    emptyWrap: "bg-slate-50 border-slate-200",
    statusActive: "bg-emerald-50 text-emerald-600 border-emerald-100",
    statusDefault: "bg-indigo-50 text-indigo-600 border-indigo-100",
    liveGlow: "shadow-[0_4px_20px_rgba(239,68,68,0.06)]",
    cardGlow: "hover:shadow-[0_8px_40px_rgba(99,102,241,0.08)]",
    gradMesh: "bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.07),transparent)]",
    gradMesh2: "bg-[radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(99,102,241,0.04),transparent)]",
    navBg: "bg-white/90 backdrop-blur-2xl border-slate-200/80",
  },
};

// ─── useTheme hook ─────────────────────────────────────────────────────────────

function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
    }
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (mounted) localStorage.setItem("theme", next);
  };

  return { theme, toggle, t: tokens[theme], mounted };
}

// ─── Animated Background ───────────────────────────────────────────────────────

function AnimatedBackground({ t }: { t: ThemeTokens }) {
  return (
    <>
      <div className={`fixed inset-0 pointer-events-none ${t.gradMesh} transition-all duration-700`} />
      <div className={`fixed inset-0 pointer-events-none ${t.gradMesh2} transition-all duration-700`} />
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />
    </>
  );
}

// ─── Floating Theme Toggle ─────────────────────────────────────────────────────

interface FloatingThemeToggleProps {
  theme: Theme;
  toggle: () => void;
  t: ThemeTokens;
}

function FloatingThemeToggle({ theme, toggle, t }: FloatingThemeToggleProps) {
  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      className={`fixed bottom-24 right-5 md:bottom-8 md:right-8 z-50 w-11 h-11 rounded-2xl border flex items-center justify-center shadow-xl transition-all duration-500 ${t.toggleBg}`}
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait">
        {theme === "dark" ? (
          <motion.svg
            key="sun"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`w-[18px] h-[18px] ${t.textMuted}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
          </motion.svg>
        ) : (
          <motion.svg
            key="moon"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`w-4 h-4 ${t.textMuted}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ─── TeamAvatar ────────────────────────────────────────────────────────────────

interface TeamAvatarProps {
  name: string;
  logoUrl?: string;
  size?: AvatarSize;
  t: ThemeTokens;
}

function TeamAvatar({ name, logoUrl, size = "md", t }: TeamAvatarProps) {
  const sz: Record<AvatarSize, string> = {
    sm: "w-9 h-9 text-sm",
    md: "w-12 h-12 text-base",
    lg: "w-16 h-16 text-xl",
  };
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`${sz[size]} rounded-2xl ${t.avatarBg} border flex items-center justify-center overflow-hidden shrink-0 transition-all duration-500`}>
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={`font-black ${t.textAccent}`}>{name?.[0] ?? "?"}</span>
      )}
    </div>
  );
}

// ─── Badges ────────────────────────────────────────────────────────────────────

function LiveBadge({ t }: { t: ThemeTokens }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-500 ${t.countLive}`}>
      <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
      LIVE
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  t: ThemeTokens;
}

function StatusBadge({ status, t }: StatusBadgeProps) {
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all duration-500 ${status === "active" ? t.statusActive : t.statusDefault}`}>
      {status || "upcoming"}
    </span>
  );
}

// ─── Shimmer Skeleton ──────────────────────────────────────────────────────────

function SkeletonCard({ t }: { t: ThemeTokens }) {
  return (
    <div className={`${t.surface} rounded-2xl p-5 border ${t.border} overflow-hidden relative`}>
      <div className="space-y-4 animate-pulse">
        <div className={`h-2.5 w-1/3 ${t.skeletonBase} rounded-full`} />
        <div className="flex gap-4 items-center">
          <div className={`w-12 h-12 rounded-2xl ${t.skeletonBase} shrink-0`} />
          <div className="flex-1 space-y-2.5">
            <div className={`h-3 w-2/3 ${t.skeletonBase} rounded-full`} />
            <div className={`h-2 w-1/2 ${t.skeletonBase} rounded-full`} />
          </div>
        </div>
        <div className={`h-px w-full ${t.skeletonBase}`} />
        <div className={`h-2 w-3/4 ${t.skeletonBase} rounded-full`} />
      </div>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-linear-to-r from-transparent via-white/4 to-transparent" />
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  message: string;
  t: ThemeTokens;
}

function EmptyState({ message, t }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
      <div className={`relative w-20 h-20 rounded-3xl ${t.emptyWrap} border flex items-center justify-center transition-all duration-500`}>
        <svg className={`w-8 h-8 ${t.textMuted} relative z-10`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      </div>
      <div className="space-y-1.5">
        <p className={`${t.text} text-sm font-bold`}>Nothing here yet</p>
        <p className={`${t.textMuted} text-xs uppercase tracking-[0.3em] font-bold`}>{message}</p>
      </div>
    </div>
  );
}

// ─── Live Match Card ───────────────────────────────────────────────────────────

interface LiveMatchCardProps {
  match: Match;
  t: ThemeTokens;
  index: number;
}

function LiveMatchCard({ match, t, index }: LiveMatchCardProps) {
  return (
    <Link href={`/match/${match.id}`} className="block h-full">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.07, type: "spring", stiffness: 280, damping: 24 }}
        whileHover={{ y: -6, scale: 1.015 }}
        whileTap={{ scale: 0.97 }}
        className={`${t.surface} p-6 rounded-3xl border ${t.border} ${t.borderHover} ${t.cardHover} ${t.cardGlow} ${t.liveGlow} shadow-sm cursor-pointer h-full transition-all duration-300 relative overflow-hidden group`}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-red-500/40 to-transparent" />

        <div className="flex items-start justify-between gap-2 mb-6">
          <span className={`text-[9px] font-black ${t.textAccent} uppercase tracking-widest leading-tight line-clamp-2 flex-1`}>
            {match.tournament_name || "Major Series"}
          </span>
          <LiveBadge t={t} />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-2.5 flex-1 min-w-0">
            <TeamAvatar name={match.team_a_name} logoUrl={match.team_a_logo_url} size="md" t={t} />
            <span className={`text-[11px] font-black uppercase tracking-tight ${t.text} text-center w-full truncate`}>
              {match.team_a_name}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className={`text-[10px] font-black ${t.textDim} uppercase tracking-widest`}>VS</span>
            <div className={`w-px h-4 ${t.skeletonBase}`} />
          </div>

          <div className="flex flex-col items-center gap-2.5 flex-1 min-w-0">
            <TeamAvatar name={match.team_b_name} logoUrl={match.team_b_logo_url} size="md" t={t} />
            <span className={`text-[11px] font-black uppercase tracking-tight ${t.text} text-center w-full truncate`}>
              {match.team_b_name}
            </span>
          </div>
        </div>

        <div className={`mt-6 pt-4 border-t ${t.border} flex items-center justify-between gap-2`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <svg className={`w-3 h-3 ${t.textMuted} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className={`text-[9px] ${t.textMuted} font-bold uppercase tracking-wider truncate`}>{match.venue}</span>
          </div>
          <motion.span
            className={`${t.textAccent} text-base font-black shrink-0`}
            animate={{ x: [0, 3, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >→</motion.span>
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Recent Match Row ──────────────────────────────────────────────────────────

interface RecentMatchRowProps {
  match: Match;
  t: ThemeTokens;
  index: number;
}

function RecentMatchRow({ match, t, index }: RecentMatchRowProps) {
  return (
    <Link href={`/match/${match.id}`} className="block">
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 26 }}
        whileHover={{ x: 5 }}
        whileTap={{ scale: 0.99 }}
        className={`${t.surface} p-4 rounded-2xl border ${t.border} ${t.borderHover} ${t.cardHover} ${t.cardGlow} transition-all duration-300 cursor-pointer group`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex sm:hidden items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${t.pill}`}>
              {match.tournament_name || "Tournament"}
            </span>
            <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${t.pillAccent}`}>
              Finished
            </span>
          </div>

          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <TeamAvatar name={match.team_a_name} logoUrl={match.team_a_logo_url} size="sm" t={t} />
              <span className={`text-sm font-black uppercase tracking-tight ${t.text} truncate`}>{match.team_a_name}</span>
            </div>
            <span className={`${t.textDim} font-black text-[10px] uppercase shrink-0 tracking-widest`}>vs</span>
            <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end sm:justify-start">
              <TeamAvatar name={match.team_b_name} logoUrl={match.team_b_logo_url} size="sm" t={t} />
              <span className={`text-sm font-black uppercase tracking-tight ${t.text} truncate`}>{match.team_b_name}</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${t.pill}`}>
              {match.tournament_name || "Tournament"}
            </span>
            <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${t.pillAccent}`}>
              Finished
            </span>
          </div>

          <span className={`hidden sm:block ${t.textAccent} text-base font-black shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>→</span>
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Tournament Card ───────────────────────────────────────────────────────────

interface TournamentCardProps {
  tournament: Tournament;
  t: ThemeTokens;
  index: number;
}

function TournamentCard({ tournament, t, index }: TournamentCardProps) {
  return (
    <Link href={`/tournament/${tournament.id}`} className="block">
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 26 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`${t.surface} p-4 rounded-2xl border ${t.border} ${t.borderHover} ${t.cardHover} ${t.cardGlow} transition-all duration-300 cursor-pointer`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl ${t.avatarBg} border flex items-center justify-center overflow-hidden shrink-0 transition-all duration-500`}>
            {tournament.logo_url ? (
              <img src={tournament.logo_url} alt={tournament.name} className="w-full h-full object-cover" />
            ) : (
              <span className={`text-base font-black ${t.textAccent}`}>{tournament.name?.[0] ?? "T"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-xs font-black uppercase tracking-wider ${t.text} truncate transition-colors duration-500`}>
              {tournament.name}
            </h3>
            {tournament.venue && (
              <p className={`text-[9px] ${t.textMuted} font-bold uppercase truncate mt-0.5 tracking-wider`}>{tournament.venue}</p>
            )}
          </div>
          <StatusBadge status={tournament.status} t={t} />
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Mobile Bottom Nav ─────────────────────────────────────────────────────────

interface NavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  counts: Record<Tab, number>;
  t: ThemeTokens;
}

function MobileBottomNav({ active, onChange, counts, t }: NavProps) {
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "live",
      label: "Live",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      key: "recent",
      label: "Recent",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      key: "tournaments",
      label: "Tourneys",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t ${t.navBg} transition-all duration-500`}>
      <div className="flex items-center max-w-sm mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative"
            >
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="tabHighlight"
                    className="absolute inset-x-1 inset-y-0 rounded-2xl bg-indigo-500/10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </AnimatePresence>
              <div className={`relative z-10 transition-colors duration-200 ${isActive ? t.textAccent : t.textMuted}`}>
                {tab.icon}
              </div>
              <span className={`relative z-10 text-[9px] font-black uppercase tracking-wider transition-colors duration-200 ${isActive ? t.textAccent : t.textMuted}`}>
                {tab.label}
              </span>
              {tab.key === "live" && counts.live > 0 && (
                <span className="absolute top-2.5 right-[calc(50%-18px)] w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                  {counts.live}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Desktop Tab Pills ─────────────────────────────────────────────────────────

function DesktopTabPills({ active, onChange, counts, t }: NavProps) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "live", label: "Live Matches" },
    { key: "recent", label: "Recent" },
    { key: "tournaments", label: "Tournaments" },
  ];

  return (
    <div className={`hidden lg:flex items-center gap-1.5 p-1.5 rounded-2xl border ${t.tabBg} w-fit mb-12 transition-all duration-500`}>
      {tabs.map((tab) => (
        <motion.button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          whileTap={{ scale: 0.95 }}
          className={`relative px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${active === tab.key ? t.tabActive : t.tabInactive}`}
        >
          {active === tab.key && (
            <motion.div
              layoutId="desktopTabHighlight"
              className="absolute inset-0 rounded-xl bg-indigo-600"
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              style={{ zIndex: -1 }}
            />
          )}
          {tab.label}
          {tab.key === "live" && counts.live > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black border-0 ${active === tab.key ? "bg-white/20 text-white" : t.countLive}`}>
              {counts.live}
            </span>
          )}
        </motion.button>
      ))}
    </div>
  );
}

// ─── Section Heading ───────────────────────────────────────────────────────────

interface SectionHeadingProps {
  label: string;
  count?: number;
  countClass?: string;
  t: ThemeTokens;
  isLive?: boolean;
}

function SectionHeading({ label, count, countClass, t, isLive = false }: SectionHeadingProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="flex items-center gap-2.5">
        {isLive && <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse shrink-0" />}
        <h2 className={`text-[10px] font-black uppercase tracking-[0.4em] transition-colors duration-500 ${t.sectionLabel}`}>{label}</h2>
        {count !== undefined && count > 0 && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`px-2 py-0.5 rounded-full text-[9px] font-black border transition-all duration-500 ${countClass}`}
          >
            {count}
          </motion.span>
        )}
      </div>
      <div className={`h-px flex-1 bg-linear-to-r ${t.divider} to-transparent`} />
    </div>
  );
}

// ─── Hero Section ──────────────────────────────────────────────────────────────

interface HeroSectionProps {
  t: ThemeTokens;
  searchTerm: string;
  draftSearch: string;
  setDraftSearch: (val: string) => void;
  handleSearch: (e: FormEvent<HTMLFormElement>) => void;
  clearSearch: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
}

function HeroSection({ t, searchTerm, draftSearch, setDraftSearch, handleSearch, clearSearch, searchRef }: HeroSectionProps) {
  return (
    <section className="relative pt-24 sm:pt-32 pb-20 sm:pb-28 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 22 }}
          className="mb-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.35em] mb-8 transition-all duration-500 ${t.heroBadge}`}
          >
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
            Real-Time Cricket Intelligence
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase mb-1 leading-[0.92] transition-colors duration-500 ${t.text}`}
          >
            FIND YOUR
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase italic leading-[0.92] transition-colors duration-500 ${t.textAccent}`}
          >
            MATCH
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`${t.textMuted} text-sm sm:text-base font-medium mt-6 max-w-lg mx-auto leading-relaxed`}
          >
            Live scores, tournament brackets, and real-time analytics — all in one place.
          </motion.p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          onSubmit={handleSearch}
          className="relative group max-w-2xl mx-auto"
        >
          <div className={`relative rounded-3xl border-2 overflow-hidden shadow-2xl transition-all duration-500 focus-within:border-indigo-500/40 ${t.searchBg}`}>
            <svg className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none transition-colors duration-300 ${t.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search teams, tournaments, venues…"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              className="w-full bg-transparent py-4 sm:py-5 pl-14 pr-36 sm:pr-40 focus:outline-none text-base sm:text-[15px] font-medium transition-colors duration-500"
            />
            <AnimatePresence>
              {draftSearch && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={clearSearch}
                  className={`absolute right-28 sm:right-32 top-1/2 -translate-y-1/2 p-1.5 rounded-lg ${t.textMuted} hover:opacity-60 transition-opacity`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`absolute right-2 top-1/2 -translate-y-1/2 px-5 sm:px-7 py-2.5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm active:scale-95 transition-all duration-200 ${t.searchBtn}`}
            >
              SEARCH
            </motion.button>
          </div>
        </motion.form>

        <AnimatePresence>
          {searchTerm && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-center justify-center gap-2 mt-4 flex-wrap"
            >
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
  );
}

// ─── Error Banner ──────────────────────────────────────────────────────────────

interface ErrorBannerProps {
  error: string;
  onRetry: () => void;
}

function ErrorBanner({ error, onRetry }: ErrorBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-red-400 text-sm font-medium">{error}</p>
      </div>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-xl bg-red-500/15 text-red-400 text-xs font-black uppercase tracking-wider hover:bg-red-500/25 transition-colors shrink-0"
      >
        Retry
      </button>
    </motion.div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { theme, toggle, t } = useTheme();

  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("live");
  const [isMounted, setIsMounted] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
    if (window.innerWidth < 1024) setActiveTab("recent");
  }, []);

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

  // Debounced search
  useEffect(() => {
    if (!isMounted) return;
    const timer = setTimeout(() => {
      if (draftSearch !== searchTerm) {
        setSearchTerm(draftSearch);
        fetchData(draftSearch);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [draftSearch, isMounted, searchTerm, fetchData]);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
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
    <>
      <style>{`
        @keyframes shimmer {
          from { transform: translateX(-100%); }
          to   { transform: translateX(200%); }
        }
        .shimmer-sweep { animation: shimmer 1.8s infinite; }
      `}</style>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className={`min-h-screen font-sans transition-colors duration-700 ${t.bg} ${t.text} selection:bg-indigo-500 selection:text-white relative`}
      >
        <AnimatedBackground t={t} />

        <HeroSection
          t={t}
          searchTerm={searchTerm}
          draftSearch={draftSearch}
          setDraftSearch={setDraftSearch}
          handleSearch={handleSearch}
          clearSearch={clearSearch}
          searchRef={searchRef}
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-32 lg:pb-24 relative z-10">
          <AnimatePresence>
            {error && <ErrorBanner error={error} onRetry={() => fetchData(searchTerm)} />}
          </AnimatePresence>

          {/* <DesktopTabPills active={activeTab} onChange={setActiveTab} counts={counts} t={t} /> */}

          {/* Live */}
          <section className={`mb-14 ${activeTab !== "live" ? "hidden lg:block" : ""}`}>
            <SectionHeading label="Live Broadcast" count={!loading ? counts.live : undefined} countClass={t.countLive} t={t} isLive />
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {[1, 2, 3].map((i) => <SkeletonCard key={i} t={t} />)}
              </div>
            ) : counts.live === 0 ? (
              <div className={`${t.surface} rounded-3xl border border-dashed ${t.borderDashed}`}>
                <EmptyState message={searchTerm ? "No live matches match your search" : "No matches currently in progress"} t={t} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {liveMatches.map((match, i) => (
                  <LiveMatchCard key={match.id} match={match} t={t} index={i} />
                ))}
              </div>
            )}
          </section>

          {/* Recent + Tournaments */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
            <div className={`lg:col-span-2 ${activeTab !== "recent" ? "hidden lg:block" : ""}`}>
              <SectionHeading label="Recently Concluded" count={!loading ? counts.recent : undefined} countClass={t.countRecent} t={t} />
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} t={t} />)}
                </div>
              ) : counts.recent === 0 ? (
                <div className={`${t.surface} rounded-3xl border border-dashed ${t.borderDashed}`}>
                  <EmptyState message="No completed matches found" t={t} />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentMatches.map((match, i) => (
                    <RecentMatchRow key={match.id} match={match} t={t} index={i} />
                  ))}
                </div>
              )}
            </div>

            <div className={`${activeTab !== "tournaments" ? "hidden lg:block" : ""}`}>
              <SectionHeading label="Tournaments" count={!loading ? counts.tournaments : undefined} countClass={t.countTourneys} t={t} />
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <SkeletonCard key={i} t={t} />)}
                </div>
              ) : counts.tournaments === 0 ? (
                <div className={`${t.surface} rounded-3xl border border-dashed ${t.borderDashed}`}>
                  <EmptyState message="No tournaments found" t={t} />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {tournaments.map((tournament, i) => (
                    <TournamentCard key={tournament.id} tournament={tournament} t={t} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className={`py-16 border-t text-center transition-all duration-500 ${t.footer} relative z-10`}>
          <div className="max-w-7xl mx-auto px-6">
            <div className={`text-3xl font-black tracking-tighter uppercase italic mb-3 select-none transition-colors duration-500 ${t.footerLogo}`}>SCORY</div>
            <p className={`text-[9px] font-black uppercase tracking-[0.6em] transition-colors duration-500 ${t.textMuted} opacity-40`}>
              End-to-End Real-Time Analytics Engine · Made By UDP
            </p>
          </div>
        </footer>

        <MobileBottomNav active={activeTab} onChange={setActiveTab} counts={counts} t={t} />
        <FloatingThemeToggle theme={theme} toggle={toggle} t={t} />
      </motion.div>
    </>
  );
}