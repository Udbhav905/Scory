"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Player {
  id: number;
  name: string;
  team: string;
}
interface Innings {
  id: number;
  innings_number: number;
  batting_team: string;
  bowling_team: string;
  total_runs: number;
  total_wickets: number;
  overs: number;
}
interface BallEvent {
  id: number;
  innings_id: number;
  over_number: number;
  ball_number: number;
  batsman_id: number | null;
  bowler_id: number | null;
  runs: number;
  extra_runs: number;
  extra_type: string | null;
  is_wicket: boolean;
  wicket_type: string | null;
  dismissed_batsman_id?: number | null;
  new_batsman_id?: number | null;
}

const toOvers = (lb: number) => `${Math.floor(lb / 6)}.${lb % 6}`;
const isLegal = (b: BallEvent) => b.extra_type !== "wide" && b.extra_type !== "no ball";

const rotatesStrike = (b: BallEvent): boolean => {
  if (b.is_wicket) return false;
  if (b.extra_type === "wide" || b.extra_type === "no ball") return false;
  if (b.extra_type === "bye" || b.extra_type === "leg bye") return (b.runs + b.extra_runs) % 2 === 1;
  return b.runs % 2 === 1;
};

function computeStats(innings: Innings | null, balls: BallEvent[], players: Player[], target: number | null, totalOvers: number) {
  if (!innings) return null;

  const sorted = [...balls].sort((a, b) => a.over_number * 100 + a.ball_number - (b.over_number * 100 + b.ball_number));

  let runs = 0,
    wickets = 0,
    legalBalls = 0;
  const batStats = new Map<number, { runs: number; balls: number; fours: number; sixes: number }>();
  const bowlStats = new Map<number, { runs: number; wickets: number; legal: number; maidens: number }>();
  const bowlerOverRuns = new Map<number, Map<number, number>>();
  const fow: { over: string; runs: number; wicket: number; batsman: string }[] = [];
  const last6: string[] = [];
  const dismissed = new Set<number>();

  let striker: number | null = null;
  let nonStriker: number | null = null;
  let bowler: number | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    const legal = isLegal(b);
    const toBat = b.extra_type === "bye" || b.extra_type === "leg bye" ? 0 : b.runs;
    const toBowl = b.extra_type === "bye" || b.extra_type === "leg bye" ? b.extra_runs : b.extra_type === "no ball" ? 1 + b.runs : b.extra_type === "wide" ? 1 + b.runs : b.runs;

    runs += b.runs + b.extra_runs;

    if (b.bowler_id) {
      const s = bowlStats.get(b.bowler_id) ?? { runs: 0, wickets: 0, legal: 0, maidens: 0 };
      s.runs += toBowl;
      if (legal) s.legal++;
      if (b.is_wicket && b.dismissed_batsman_id) s.wickets++;
      bowlStats.set(b.bowler_id, s);
      if (!bowlerOverRuns.has(b.bowler_id)) bowlerOverRuns.set(b.bowler_id, new Map());
      const om = bowlerOverRuns.get(b.bowler_id)!;
      om.set(b.over_number, (om.get(b.over_number) ?? 0) + toBowl);
    }

    if (b.batsman_id) {
      const s = batStats.get(b.batsman_id) ?? { runs: 0, balls: 0, fours: 0, sixes: 0 };
      s.runs += toBat;
      if (legal) {
        s.balls++;
        if (b.runs === 4) s.fours++;
        if (b.runs === 6) s.sixes++;
      }
      batStats.set(b.batsman_id, s);
    }

    if (b.is_wicket && b.dismissed_batsman_id) {
      wickets++;
      dismissed.add(b.dismissed_batsman_id);
      fow.push({
        over: toOvers(legalBalls),
        runs,
        wicket: wickets,
        batsman: players.find((p) => p.id === b.dismissed_batsman_id)?.name ?? "Unknown",
      });
    }

    if (legal) legalBalls++;

    if (striker === null && b.batsman_id) striker = b.batsman_id;

    if (b.is_wicket && b.new_batsman_id) {
      // New batsman replaces the dismissed player at the same end
      if (b.dismissed_batsman_id === striker) striker = b.new_batsman_id;
      else nonStriker = b.new_batsman_id;
    } else if (rotatesStrike(b)) {
      [striker, nonStriker] = [nonStriker, striker];
    }

    if (legal && legalBalls % 6 === 0 && i < sorted.length - 1) {
      [striker, nonStriker] = [nonStriker, striker];
      bowler = null;
    } else {
      bowler = b.bowler_id;
    }

    if (legal) {
      const sym = b.is_wicket ? "W" : b.runs === 6 ? "6" : b.runs === 4 ? "4" : b.runs === 0 ? "•" : String(b.runs);
      last6.push(sym);
      if (last6.length > 6) last6.shift();
    }
  }

  for (const [bid, om] of bowlerOverRuns.entries()) {
    const lp = new Map<number, number>();
    for (const b of sorted) if (b.bowler_id === bid && isLegal(b)) lp.set(b.over_number, (lp.get(b.over_number) ?? 0) + 1);
    let m = 0;
    for (const [ov, r] of om.entries()) if ((lp.get(ov) ?? 0) >= 6 && r === 0) m++;
    const s = bowlStats.get(bid);
    if (s) s.maidens = m;
  }

  let pRuns = 0,
    pBalls = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const b = sorted[i];
    if (b.is_wicket) break;
    pRuns += b.runs + (b.extra_type === "bye" || b.extra_type === "leg bye" ? b.extra_runs : 0);
    if (isLegal(b)) pBalls++;
  }

  const overs = legalBalls / 6;
  const crr = overs > 0 ? (runs / overs).toFixed(2) : "0.00";
  let rrr: string | null = null;
  if (target && innings.innings_number === 2) {
    const needed = target - runs,
      left = totalOvers - overs;
    if (left > 0 && needed > 0) rrr = (needed / left).toFixed(2);
  }

  const battingPlayers = players.filter((p) => p.team === innings.batting_team);
  const yetToBat = battingPlayers.filter((p) => !dismissed.has(p.id) && p.id !== striker && p.id !== nonStriker);

  return {
    runs,
    wickets,
    legalBalls,
    crr,
    rrr,
    striker,
    nonStriker,
    bowler,
    batStats,
    bowlStats,
    fow,
    last6,
    yetToBat,
    partnership: { runs: pRuns, balls: pBalls },
    isOverComplete: legalBalls > 0 && legalBalls % 6 === 0,
  };
}

export default function Scorecard({ matchId, teamA, teamALogo, teamB, teamBLogo, totalOvers, matchStatus, isOwner }: { matchId: number; teamA: string; teamALogo?: string; teamB: string; teamBLogo?: string; totalOvers: number; matchStatus: string; isOwner: boolean }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [allInnings, setAllInnings] = useState<Innings[]>([]);
  const [currentInnings, setCurrentInnings] = useState<Innings | null>(null);
  const [ballEvents, setBallEvents] = useState<BallEvent[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [viewInningsId, setViewInningsId] = useState<number | null>(null);
  const [viewBalls, setViewBalls] = useState<BallEvent[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [runFlash, setRunFlash] = useState<{ on: boolean; val: number }>({ on: false, val: 0 });
  const [showBowler, setShowBowler] = useState(false);
  const [showWicket, setShowWicket] = useState(false);
  const [showStriker, setShowStriker] = useState(false);
  const [showNonStr, setShowNonStr] = useState(false);
  const [wkType, setWkType] = useState<string | null>(null);
  const [dismissedId, setDismissedId] = useState<number | null>(null);
  const [newBatId, setNewBatId] = useState<number | null>(null);
  const [localStriker, setLocalStriker] = useState<number | null>(null);
  const [localNonStriker, setLocalNonStriker] = useState<number | null>(null);
  const [localBowler, setLocalBowler] = useState<number | null>(null);
  const inningsIdRef = useRef<number | null>(null);
  const autoCompleteRef = useRef(false);
  const autoModalRef = useRef(false);
  const justStartedRef = useRef(false);
  // Keep track of previous total runs for animation (for non‑owner updates)
  const prevTotalRunsRef = useRef<number>(0);

  const target = allInnings.length >= 2 ? allInnings[0].total_runs + 1 : null;

  const displayedInnings = useMemo(() => (viewInningsId != null ? (allInnings.find((i) => i.id === viewInningsId) ?? null) : currentInnings), [viewInningsId, allInnings, currentInnings]);
  const displayedBalls = viewInningsId === currentInnings?.id ? ballEvents : viewBalls;
  const displayedStats = useMemo(() => computeStats(displayedInnings, displayedBalls, players, target, totalOvers), [displayedInnings, displayedBalls, players, target, totalOvers]);
  const currentStats = useMemo(() => computeStats(currentInnings, ballEvents, players, target, totalOvers), [currentInnings, ballEvents, players, target, totalOvers]);

  // Animation for any increase in total runs (owner or non‑owner)
  useEffect(() => {
    if (currentStats && currentStats.runs !== prevTotalRunsRef.current) {
      const diff = currentStats.runs - prevTotalRunsRef.current;
      if (diff > 0) {
        setRunFlash({ on: true, val: diff });
        setTimeout(() => setRunFlash({ on: false, val: 0 }), 1100);
      }
      prevTotalRunsRef.current = currentStats.runs;
    }
  }, [currentStats?.runs]);

  const inningsComplete = useCallback((): boolean => {
    if (!currentInnings || !currentStats) return false;
    if (ballEvents.length === 0) return false;
    if (currentStats.legalBalls === 0) return false;
    const batters = players.filter((p) => p.team === currentInnings.batting_team);
    if (batters.length === 0) return false;
    if (currentStats.wickets >= batters.length - 1) return true;
    if (currentStats.legalBalls >= totalOvers * 6) return true;
    if (currentInnings.innings_number === 2 && target !== null && currentStats.runs >= target) return true;
    return false;
  }, [currentInnings, currentStats, ballEvents.length, players, totalOvers, target]);

  const getBatsmen = useCallback(
    (excludeIds: (number | null)[] = []) => {
      if (!currentInnings) return [];
      const ex = new Set(excludeIds.filter(Boolean) as number[]);
      const out = new Set(ballEvents.filter((b) => b.is_wicket && b.dismissed_batsman_id).map((b) => b.dismissed_batsman_id!));
      return players.filter((p) => p.team === currentInnings.batting_team && !out.has(p.id) && !ex.has(p.id));
    },
    [currentInnings, players, ballEvents],
  );

  const getBowlers = useCallback(() => {
    if (!currentInnings) return [];
    const legal = ballEvents.filter(isLegal);
    const lastBowler = legal.length > 0 && legal.length % 6 === 0 ? legal[legal.length - 1].bowler_id : null;
    return players.filter((p) => p.team === currentInnings.bowling_team && p.id !== lastBowler);
  }, [currentInnings, players, ballEvents]);

  const matchWinner = useMemo(() => {
    if (allInnings.length !== 2 || !inningsComplete()) return null;
    const [f, s] = allInnings;
    if (s.total_runs > f.total_runs) {
      const team = s.batting_team === "team_a" ? teamA : teamB;
      const totalBatsmen = players.filter((p) => p.team === s.batting_team).length;
      const margin = totalBatsmen - s.total_wickets;
      return `${team} won by ${margin} wicket${margin !== 1 ? "s" : ""}`;
    }
    if (f.total_runs > s.total_runs) {
      const team = f.batting_team === "team_a" ? teamA : teamB;
      const margin = f.total_runs - s.total_runs;
      return `${team} won by ${margin} run${margin !== 1 ? "s" : ""}`;
    }
    return "Match Tied";
  }, [allInnings, players, teamA, teamB, inningsComplete]);

  const refreshData = useCallback(
    async (spinner = true, forceViewLatest = false) => {
      if (spinner) setUpdating(true);
      try {
        const [pRes, iRes] = await Promise.all([fetch(`/api/players?matchId=${matchId}`).then((r) => r.json()), fetch(`/api/innings?matchId=${matchId}`).then((r) => r.json())]);
        setPlayers(pRes);
        setAllInnings(iRes);
        if (iRes.length > 0) {
          const inn = iRes[iRes.length - 1];
          inn.overs = Number(inn.overs) || 0;
          setCurrentInnings(inn);
          const balls = await fetch(`/api/score?inningsId=${inn.id}`).then((r) => r.json());
          setBallEvents(balls);
          setViewInningsId((prev) => (prev === null || forceViewLatest ? inn.id : prev));
        } else {
          setCurrentInnings(null);
          setBallEvents([]);
        }
      } catch (e) {
        console.error(e);
      }
      if (spinner) setUpdating(false);
    },
    [matchId],
  );

  useEffect(() => {
    (async () => {
      setInitialLoading(true);
      await refreshData(false);
      setInitialLoading(false);
    })();
  }, [refreshData]);

  useEffect(() => {
    if (viewInningsId && viewInningsId !== currentInnings?.id) {
      fetch(`/api/score?inningsId=${viewInningsId}`)
        .then((r) => r.json())
        .then(setViewBalls);
    } else {
      setViewBalls([]);
    }
  }, [viewInningsId, currentInnings?.id]);

  useEffect(() => {
    let pusher: any = null,
      ch: any = null,
      alive = true;
    (async () => {
      const Pusher = (await import("pusher-js")).default;
      if (!alive) return;
      pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! });
      ch = pusher.subscribe(`match-${matchId}`);
      ch.bind("score-update", () => refreshData(true));
    })();
    return () => {
      alive = false;
      try {
        ch?.unbind_all();
        pusher?.unsubscribe(`match-${matchId}`);
        pusher?.disconnect();
      } catch {}
    };
  }, [matchId, refreshData]);

  useEffect(() => {
    if (!isOwner || matchStatus === "completed" || autoCompleteRef.current) return;
    if (justStartedRef.current) return;
    if (allInnings.length === 2 && ballEvents.length > 0 && currentStats && currentStats.legalBalls > 0 && inningsComplete()) {
      autoCompleteRef.current = true;
      fetch("/api/matches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: matchId, status: "completed" }),
      }).then(() => window.location.reload());
    }
  }, [allInnings.length, ballEvents.length, currentStats, inningsComplete, matchStatus, matchId, isOwner]);

  useEffect(() => {
    if (!currentInnings) return;
    if (inningsIdRef.current !== currentInnings.id) {
      inningsIdRef.current = currentInnings.id;
      setLocalStriker(null);
      setLocalNonStriker(null);
      setLocalBowler(null);
      autoCompleteRef.current = false;
      autoModalRef.current = false;
      justStartedRef.current = false;
    }
  }, [currentInnings?.id]);

  const isViewingCurrent = viewInningsId === currentInnings?.id;

  useEffect(() => {
    if (!isOwner || !currentInnings || !isViewingCurrent || inningsComplete()) return;
    const noBalls = ballEvents.length === 0;
    const overEnded = currentStats?.isOverComplete && currentStats.bowler === null && !localBowler;
    if (noBalls) {
      if (!localStriker) setShowStriker(true);
      else if (!localNonStriker) setShowNonStr(true);
      else if (!localBowler) setShowBowler(true);
    } else if (overEnded && !autoModalRef.current) {
      autoModalRef.current = true;
      setShowBowler(true);
    }
    if (!overEnded) autoModalRef.current = false;
  }, [isOwner, currentInnings?.id, isViewingCurrent, ballEvents.length, currentStats?.isOverComplete, currentStats?.bowler, localStriker, localNonStriker, localBowler, inningsComplete]);

  const efStriker = ballEvents.length > 0 ? (currentStats?.striker ?? localStriker) : localStriker;
  const efNonStriker = ballEvents.length > 0 ? (currentStats?.nonStriker ?? localNonStriker) : localNonStriker;
  const efBowler = localBowler ?? (ballEvents.length > 0 ? currentStats?.bowler : null);

  const applyLocal = (runs: number, extra: string | null, isWicket: boolean, dis: number | null, newB: number | null, prevLegal: number) => {
    let s = localStriker,
      ns = localNonStriker;
    const fakeB: BallEvent = { id: 0, innings_id: 0, over_number: 0, ball_number: 0, batsman_id: s, bowler_id: localBowler, runs, extra_runs: extra ? 1 : 0, extra_type: extra, is_wicket: isWicket, wicket_type: null, dismissed_batsman_id: dis, new_batsman_id: newB };
    if (isWicket && dis && newB) {
      if (dis === s) s = newB;
      else ns = newB;
    } else if (rotatesStrike(fakeB)) {
      [s, ns] = [ns, s];
    }
    const thisLegal = extra !== "wide" && extra !== "no ball";
    const newLegal = prevLegal + (thisLegal ? 1 : 0);
    if (thisLegal && newLegal % 6 === 0) {
      [s, ns] = [ns, s];
      setLocalBowler(null);
      autoModalRef.current = false;
    }
    setLocalStriker(s);
    setLocalNonStriker(ns);
  };

  const recordBall = async (runs: number, extra: string | null = null, isWicket = false, wType: string | null = null, dis?: number, newBat?: number) => {
    if (!isOwner || !currentInnings || !isViewingCurrent || inningsComplete()) return;
    if (!localStriker) {
      setShowStriker(true);
      return;
    }
    if (!localBowler) {
      setShowBowler(true);
      return;
    }
    setSubmitting(true);
    try {
      const legal = ballEvents.filter(isLegal).length;
      const payload = {
        innings_id: currentInnings.id,
        over_number: Math.floor(legal / 6),
        ball_number: (legal % 6) + 1,
        batsman_id: localStriker,
        bowler_id: localBowler,
        runs,
        is_wicket: isWicket,
        wicket_type: wType ?? null,
        extra_type: extra ?? null,
        extra_runs: extra === "wide" || extra === "no ball" ? 1 : 0,
        dismissed_batsman_id: isWicket ? (dis ?? null) : null,
        new_batsman_id: isWicket ? (newBat ?? null) : null,
      };
      const res = await fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        // The animation will be triggered by the useEffect that watches currentStats.runs
        applyLocal(runs, extra, isWicket, dis ?? null, newBat ?? null, legal);
        await refreshData(true);
        setShowWicket(false);
        setWkType(null);
        setDismissedId(null);
        setNewBatId(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to record ball");
      }
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  const undoLastBall = async () => {
    if (!isOwner || !currentInnings || ballEvents.length === 0 || !confirm("Undo last ball?")) return;
    setUndoing(true);
    try {
      const res = await fetch(`/api/score?inningsId=${currentInnings.id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setLocalBowler(null);
        autoModalRef.current = false;
        await refreshData(true);
      } else {
        const data = await res.json();
        alert(data.error || "Undo failed");
      }
    } catch (err) {
      console.error(err);
    }
    setUndoing(false);
  };

  const resetInn = async () => {
    if (!isOwner || !currentInnings || !confirm("⚠️ RESET ENTIRE INNINGS? Cannot be undone.")) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/innings/reset?inningsId=${currentInnings.id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setLocalStriker(null);
        setLocalNonStriker(null);
        setLocalBowler(null);
        inningsIdRef.current = null;
        autoCompleteRef.current = false;
        autoModalRef.current = false;
        justStartedRef.current = false;
        await refreshData(true);
      } else {
        alert((await res.json()).error ?? "Reset failed");
      }
    } catch {
      alert("Network error");
    }
    setResetting(false);
  };

  const finishMatch = async () => {
    if (!isOwner || !confirm("Mark match as completed?")) return;
    setSubmitting(true);
    try {
      await fetch("/api/matches", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: matchId, status: "completed" }) });
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  const startSecondInnings = async () => {
    if (!isOwner || !confirm("Start second innings? Teams will swap.")) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/innings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ match_id: matchId }) });
      if (!res.ok) {
        alert((await res.json()).error ?? "Failed");
        return;
      }
      setLocalStriker(null);
      setLocalNonStriker(null);
      setLocalBowler(null);
      inningsIdRef.current = null;
      autoCompleteRef.current = false;
      autoModalRef.current = false;
      justStartedRef.current = true;
      setTimeout(() => {
        justStartedRef.current = false;
      }, 2000);
      await refreshData(true, true);
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  if (initialLoading)
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-9 h-9 border-2 border-[#e63946]/30 border-t-[#e63946] rounded-full animate-spin" />
        <span className="text-[#a8dadc]/50 text-[10px] font-black uppercase tracking-widest mt-3">Loading…</span>
      </div>
    );
  if (!currentInnings)
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="text-4xl">🏏</span>
        <span className="text-[#a8dadc]/50 text-[10px] font-black uppercase tracking-widest">Waiting for toss…</span>
      </div>
    );

  const st = displayedStats;
  const dispName = displayedInnings?.batting_team === "team_a" ? teamA : teamB;
  const dispLogo = displayedInnings?.batting_team === "team_a" ? teamALogo : teamBLogo;
  const dispBatters = players.filter((p) => p.team === displayedInnings?.batting_team);
  const dispBowlers = players.filter((p) => p.team === displayedInnings?.bowling_team);
  const isMatchDone = matchStatus === "completed";
  const scoringAllowed = isOwner && !isMatchDone && isViewingCurrent && !inningsComplete();
  const curOver = st ? Math.floor(st.legalBalls / 6) : 0;
  const ballsInOv = st ? st.legalBalls % 6 : 0;

  const batRows = dispBatters.map((p) => {
    const s = st?.batStats.get(p.id) ?? { runs: 0, balls: 0, fours: 0, sixes: 0 };
    const sr = s.balls > 0 ? ((s.runs / s.balls) * 100).toFixed(1) : "-";
    const out = displayedBalls.some((b) => b.dismissed_batsman_id === p.id);
    const isStr = isViewingCurrent && p.id === efStriker;
    const isNS = isViewingCurrent && p.id === efNonStriker;
    return { p, ...s, sr, out, isStr, isNS, shown: s.balls > 0 || isStr || isNS || out };
  });

  const bowlRows = dispBowlers.map((p) => {
    const s = st?.bowlStats.get(p.id) ?? { runs: 0, wickets: 0, legal: 0, maidens: 0 };
    const ov = toOvers(s.legal);
    const ec = s.legal > 0 ? (s.runs / (s.legal / 6)).toFixed(2) : "-";
    const cur = isViewingCurrent && p.id === efBowler;
    return { p, ov, m: s.maidens, r: s.runs, w: s.wickets, ec, cur, shown: cur || s.legal > 0 };
  });

  const oversMap = new Map<number, BallEvent[]>();
  displayedBalls.forEach((b) => {
    if (!oversMap.has(b.over_number)) oversMap.set(b.over_number, []);
    oversMap.get(b.over_number)!.push(b);
  });

  const WKTS = ["Bowled", "Caught", "LBW", "Run Out", "Stumped", "Hit Wicket", "Obstructing Field"];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 space-y-4 sm:space-y-5 pb-36 select-none">
      <AnimatePresence>
        {updating && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-black/80 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/10"
          >
            <span className="w-1.5 h-1.5 bg-[#e63946] rounded-full animate-pulse" /> Updating
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {runFlash.on && (
          <motion.div
            key={runFlash.val + "-" + Date.now()}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1.3 }}
            exit={{ opacity: 0, scale: 0.6, y: -40 }}
            transition={{ duration: 0.45 }}
            className="fixed inset-0 flex items-center justify-center z-[200] pointer-events-none"
          >
            <span
              className={`text-7xl sm:text-9xl font-black drop-shadow-2xl ${
                runFlash.val >= 6 ? "text-purple-400" : runFlash.val >= 4 ? "text-green-400" : "text-white"
              }`}
            >
              {runFlash.val}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      {allInnings.length > 1 && (
        <div className="flex gap-2">
          {allInnings.map((inn) => (
            <button
              key={inn.id}
              onClick={() => setViewInningsId(inn.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                viewInningsId === inn.id
                  ? "bg-[#e63946] border-[#e63946] text-white"
                  : "bg-[#1d3557] border-[#457b9d]/40 text-[#a8dadc] hover:border-[#e63946]/40"
              }`}
            >
              {inn.innings_number === 1 ? "1st" : "2nd"} Inn · {inn.batting_team === "team_a" ? teamA : teamB}
            </button>
          ))}
        </div>
      )}
      <AnimatePresence>
      {matchWinner && (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="relative overflow-hidden bg-gradient-to-br from-[#1d3557] via-[#1a2a45] to-[#0f1e32] p-6 sm:p-8 rounded-2xl text-center border border-[#e63946]/40 shadow-2xl"
    >
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg,#e63946 0,#e63946 1px,transparent 0,transparent 50%)",
          backgroundSize: "12px 12px",
        }}
      />
      <div className="relative">
        <div className="text-[#a8dadc] text-[9px] font-black uppercase tracking-[0.5em] mb-2">🏆 Match Result</div>
        <div className="text-2xl sm:text-4xl font-black text-white">{matchWinner}</div>
      </div>
    </motion.div>
  )}
      </AnimatePresence>
      <div className="bg-gradient-to-br from-[#1d3557] to-[#162a44] rounded-2xl border border-[#457b9d]/30 shadow-2xl overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-[#457b9d]/50 bg-[#0f1e32] flex items-center justify-center shrink-0">
                {dispLogo ? (
                  <img src={dispLogo} alt={dispName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-[#457b9d]/40">🏏</span>
                )}
              </div>
              <div>
                <div className="text-[#a8dadc]/70 text-[9px] font-black uppercase tracking-widest mb-0.5">{dispName}</div>
                <div className="flex items-baseline gap-1.5">
                  <motion.span
                    animate={runFlash.on ? { scale: [1, 1.25, 1], color: ["#fff", "#e63946", "#fff"] } : { scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="text-5xl sm:text-6xl font-black tracking-tight leading-none text-white"
                  >
                    {st?.runs ?? 0}
                  </motion.span>
                  <span className="text-2xl sm:text-3xl font-black text-[#e63946] leading-none">/{st?.wickets ?? 0}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs font-bold text-[#a8dadc]/50">
                    {toOvers(st?.legalBalls ?? 0)} / {totalOvers} ov
                  </span>
                  {st?.isOverComplete && !inningsComplete() && isViewingCurrent && (
                    <span className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[9px] font-black uppercase rounded animate-pulse">
                      Over End
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-3">
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "Target", val: target ?? "—", color: "text-white" },
                  { label: "CRR", val: st?.crr ?? "0.00", color: "text-[#4ade80]" },
                  ...(st?.rrr ? [{ label: "RRR", val: st.rrr, color: "text-[#e63946]" }] : []),
                  { label: "Inns", val: displayedInnings?.innings_number === 1 ? "I" : "II", color: "text-[#e63946]" },
                ].map(({ label, val, color }) => (
                  <div
                    key={label}
                    className="bg-[#0f1e32]/60 px-3 py-2 rounded-xl border border-[#457b9d]/20 text-center min-w-[56px]"
                  >
                    <div className="text-[8px] text-[#a8dadc]/50 font-black uppercase">{label}</div>
                    <div className={`text-lg font-black ${color}`}>{val}</div>
                  </div>
                ))}
              </div>
              {isOwner && !isMatchDone && isViewingCurrent && (
                <div className="flex flex-wrap gap-1.5">
                  {inningsComplete() && allInnings.length === 1 && (
                    <button
                      onClick={startSecondInnings}
                      disabled={submitting}
                      className="px-3 py-1.5 bg-[#e63946] text-white font-black text-[9px] uppercase tracking-wider rounded-lg disabled:opacity-50"
                    >
                      2nd Innings →
                    </button>
                  )}
                  <button
                    onClick={undoLastBall}
                    disabled={undoing || ballEvents.length === 0}
                    className="px-3 py-1.5 bg-[#457b9d]/80 text-white font-black text-[9px] uppercase tracking-wider rounded-lg disabled:opacity-40 hover:bg-[#457b9d]"
                  >
                    ↩ Undo
                  </button>
                  <button
                    onClick={resetInn}
                    disabled={resetting}
                    className="px-3 py-1.5 bg-red-900/60 border border-red-700/50 text-red-400 font-black text-[9px] uppercase tracking-wider rounded-lg disabled:opacity-50"
                  >
                    Reset
                  </button>
                  <button
                    onClick={finishMatch}
                    className="px-3 py-1.5 bg-[#1d3557] border border-[#e63946]/40 text-[#e63946] font-black text-[9px] uppercase tracking-wider rounded-lg hover:border-[#e63946]"
                  >
                    Finish
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="px-5 sm:px-6 pb-4 border-t border-[#457b9d]/20 pt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[#a8dadc]/30 text-[9px] font-black uppercase tracking-widest">
                Ov {curOver + (ballsInOv > 0 ? 1 : 0)}
              </span>
              <div className="flex gap-1">
                {(st?.last6.length ?? 0) === 0 && <span className="text-[#a8dadc]/20 text-xs">—</span>}
                {st?.last6.map((b, i) => (
                  <span
                    key={i}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black ${
                      b === "W"
                        ? "bg-red-500/25 text-red-400 border border-red-500/30"
                        : b === "6"
                        ? "bg-purple-500/25 text-purple-300 border border-purple-500/30"
                        : b === "4"
                        ? "bg-green-500/25 text-green-400 border border-green-500/30"
                        : "bg-[#457b9d]/20 text-[#a8dadc] border border-[#457b9d]/15"
                    }`}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
            {isViewingCurrent && (efStriker || efBowler) && (
              <div className="hidden sm:flex items-center gap-3 text-[9px] font-black uppercase tracking-wider">
                {efStriker && (
                  <span className="text-[#f1faee]">
                    <span className="text-[#e63946]">★ </span>
                    {players.find((p) => p.id === efStriker)?.name}
                  </span>
                )}
                {efNonStriker && <span className="text-[#a8dadc]/50">{players.find((p) => p.id === efNonStriker)?.name}</span>}
                {efBowler && <span className="text-[#4ade80]/70">⚡ {players.find((p) => p.id === efBowler)?.name}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#1d3557]/60 rounded-2xl border border-[#457b9d]/25 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#457b9d]/20">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#e63946]">🏏 Batting</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#a8dadc]/50 text-[9px] font-black uppercase border-b border-[#457b9d]/15">
                  <th className="text-left px-4 py-2.5">Batter</th>
                  <th className="text-center px-2 py-2.5">R</th>
                  <th className="text-center px-2 py-2.5">B</th>
                  <th className="text-center px-2 py-2.5">4s</th>
                  <th className="text-center px-2 py-2.5">6s</th>
                  <th className="text-center px-2 py-2.5">SR</th>
                </tr>
              </thead>
              <tbody>
                {batRows
                  .filter((r) => r.shown)
                  .map((r) => (
                    <tr
                      key={r.p.id}
                      className={`border-b border-[#457b9d]/10 ${
                        r.isStr ? "bg-[#e63946]/8" : r.isNS ? "bg-[#457b9d]/8" : ""
                      }`}
                    >
                      <td className="px-4 py-2.5 font-bold text-[#f1faee] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {r.isStr && <span className="w-1.5 h-1.5 rounded-full bg-[#e63946]" title="On strike" />}
                          {r.isNS && <span className="w-1.5 h-1.5 rounded-full bg-[#457b9d]" title="Non-striker" />}
                          <span className={r.out ? "text-[#a8dadc]/40 line-through" : ""}>{r.p.name}</span>
                          {r.out && <span className="text-[#e63946]/60 text-[8px]">out</span>}
                        </div>
                      </td>
                      <td className="text-center px-2 py-2.5 font-black text-white">{r.runs}</td>
                      <td className="text-center px-2 py-2.5 text-[#a8dadc]/70">{r.balls}</td>
                      <td className="text-center px-2 py-2.5 text-[#4ade80]/80">{r.fours}</td>
                      <td className="text-center px-2 py-2.5 text-purple-400">{r.sixes}</td>
                      <td className="text-center px-2 py-2.5 text-[#e63946]">{r.sr}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {(st?.yetToBat.length ?? 0) > 0 && (
              <div className="px-4 py-2.5 border-t border-[#457b9d]/15">
                <span className="text-[8px] font-black text-[#a8dadc]/40 uppercase tracking-widest mr-1.5">Yet to bat:</span>
                <span className="text-[10px] text-[#a8dadc]/60">{st!.yetToBat.map((p) => p.name).join(", ")}</span>
              </div>
            )}
          </div>
        </div>
        <div className="bg-[#1d3557]/60 rounded-2xl border border-[#457b9d]/25 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#457b9d]/20">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#e63946]">⚡ Bowling</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#a8dadc]/50 text-[9px] font-black uppercase border-b border-[#457b9d]/15">
                  <th className="text-left px-4 py-2.5">Bowler</th>
                  <th className="text-center px-2 py-2.5">O</th>
                  <th className="text-center px-2 py-2.5">M</th>
                  <th className="text-center px-2 py-2.5">R</th>
                  <th className="text-center px-2 py-2.5">W</th>
                  <th className="text-center px-2 py-2.5">Econ</th>
                </tr>
              </thead>
              <tbody>
                {bowlRows
                  .filter((r) => r.shown)
                  .map((r) => (
                    <tr
                      key={r.p.id}
                      className={`border-b border-[#457b9d]/10 ${r.cur ? "bg-[#4ade80]/5" : ""}`}
                    >
                      <td className="px-4 py-2.5 font-bold text-[#f1faee] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {r.cur && <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />}
                          {r.p.name}
                        </div>
                      </td>
                      <td className="text-center px-2 py-2.5 text-[#a8dadc]/70">{r.ov}</td>
                      <td className="text-center px-2 py-2.5 text-[#a8dadc]/70">{r.m}</td>
                      <td className="text-center px-2 py-2.5 text-white">{r.r}</td>
                      <td className="text-center px-2 py-2.5 font-black text-[#e63946]">{r.w}</td>
                      <td className="text-center px-2 py-2.5 text-[#a8dadc]/70">{r.ec}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1d3557]/40 rounded-xl border border-[#457b9d]/20 p-4">
          <div className="text-[9px] font-black text-[#e63946] uppercase tracking-widest mb-2">Partnership</div>
          <div className="text-2xl font-black text-white">
            {st?.partnership.runs ?? 0}{" "}
            <span className="text-sm text-[#a8dadc]/50 font-bold">({st?.partnership.balls ?? 0}b)</span>
          </div>
          <div className="text-[10px] text-[#a8dadc]/60 mt-1 truncate">
            {players.find((p) => p.id === efStriker)?.name ?? "—"} &{" "}
            {players.find((p) => p.id === efNonStriker)?.name ?? "—"}
          </div>
        </div>
        <div className="bg-[#1d3557]/40 rounded-xl border border-[#457b9d]/20 p-4">
          <div className="text-[9px] font-black text-[#e63946] uppercase tracking-widest mb-2">Fall of Wickets</div>
          {(st?.fow.length ?? 0) === 0 ? (
            <div className="text-[#a8dadc]/30 text-[10px] font-bold">No wickets</div>
          ) : (
            <div className="space-y-0.5 max-h-24 overflow-y-auto">
              {st!.fow.map((f, i) => (
                <div key={i} className="flex justify-between text-[10px]">
                  <span className="text-[#a8dadc]/70">
                    {f.wicket}-{f.runs} <span className="text-[#a8dadc]/40">({f.batsman})</span>
                  </span>
                  <span className="text-[#a8dadc]/40">ov {f.over}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-[#1d3557]/40 rounded-xl border border-[#457b9d]/20 p-4">
          <div className="text-[9px] font-black text-[#e63946] uppercase tracking-widest mb-2">Yet to Bat</div>
          {(st?.yetToBat.length ?? 0) === 0 ? (
            <div className="text-[#a8dadc]/30 text-[10px] font-bold">All batted</div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {st!.yetToBat.map((p) => (
                <span
                  key={p.id}
                  className="text-[9px] bg-[#1d3557] border border-[#457b9d]/30 text-[#a8dadc]/70 px-2 py-0.5 rounded-full"
                >
                  {p.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="bg-[#1d3557]/40 rounded-2xl border border-[#457b9d]/20 p-4 sm:p-5">
        <h3 className="text-[10px] font-black text-[#e63946] uppercase tracking-widest mb-4">Ball by Ball</h3>
        {oversMap.size === 0 ? (
          <div className="text-center py-6 text-[#a8dadc]/30 text-xs font-bold uppercase tracking-widest">No deliveries yet</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from(oversMap.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([ov, bs]) => {
                const oR = bs.reduce((s, b) => s + b.runs + b.extra_runs, 0);
                const oW = bs.filter((b) => b.is_wicket).length;
                return (
                  <div key={ov} className="bg-[#0f1e32]/60 rounded-xl border border-[#457b9d]/20 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[#457b9d]/15">
                      <span className="text-[9px] font-black text-[#e63946] uppercase">Over {ov + 1}</span>
                      <span className="text-[9px] font-black text-[#a8dadc]/50">
                        {oR}R{oW > 0 ? ` ${oW}W` : ""}
                      </span>
                    </div>
                    <div className="p-2 space-y-0.5">
                      {bs.map((b, idx) => {
                        const out = b.is_wicket
                          ? `⚡ ${b.wicket_type ?? "Wicket"}`
                          : b.extra_type
                          ? `${b.extra_type.toUpperCase()}${b.extra_runs ? ` +${b.extra_runs}` : ""}`
                          : b.runs === 0
                          ? "Dot"
                          : `${b.runs} run${b.runs !== 1 ? "s" : ""}`;
                        return (
                          <div
                            key={idx}
                            className={`flex justify-between items-center rounded px-2 py-1 text-[9px] ${
                              b.is_wicket ? "bg-red-500/10 text-red-400" : "text-[#a8dadc]/70"
                            }`}
                          >
                            <span className="font-bold">{out}</span>
                            <span className="text-[#a8dadc]/40">
                              {players.find((p) => p.id === b.batsman_id)?.name ?? "?"} ·{" "}
                              {players.find((p) => p.id === b.bowler_id)?.name ?? "?"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      {scoringAllowed && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a1628]/97 backdrop-blur-xl border-t border-[#457b9d]/30 px-3 py-3"
        >
          <div className="flex items-center justify-center gap-2 mb-2.5 text-[9px] font-black uppercase tracking-widest flex-wrap">
            <span className={localStriker ? "text-[#e63946]" : "text-[#a8dadc]/25"}>
              ★ {localStriker ? players.find((p) => p.id === localStriker)?.name?.split(" ")[0] : "Striker?"}
            </span>
            <span className="text-[#457b9d]/40">·</span>
            <span className={localNonStriker ? "text-[#a8dadc]/70" : "text-[#a8dadc]/25"}>
              {localNonStriker ? players.find((p) => p.id === localNonStriker)?.name?.split(" ")[0] : "Non-striker?"}
            </span>
            <span className="text-[#457b9d]/40">·</span>
            <span className={localBowler ? "text-[#4ade80]/80" : "text-[#a8dadc]/25"}>
              ⚡ {localBowler ? players.find((p) => p.id === localBowler)?.name?.split(" ")[0] : "Bowler?"}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-2xl mx-auto">
            {[0, 1, 2, 3, 4, 6].map((r) => (
              <button
                key={r}
                onClick={() => recordBall(r)}
                disabled={submitting}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl font-black text-lg sm:text-xl transition-all active:scale-90 disabled:opacity-40 ${
                  r === 4
                    ? "bg-green-600/80 hover:bg-green-600 text-white border border-green-500/40"
                    : r === 6
                    ? "bg-purple-600/80 hover:bg-purple-600 text-white border border-purple-500/40"
                    : "bg-[#1d3557] hover:bg-[#457b9d] text-white border border-[#457b9d]/40"
                }`}
              >
                {r}
              </button>
            ))}
            <div className="w-px h-10 bg-[#457b9d]/20" />
            <button
              onClick={() => recordBall(0, "wide")}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl font-black text-[10px] bg-amber-900/60 hover:bg-amber-800/80 text-amber-400 border border-amber-700/40"
            >
              WD
            </button>
            <button
              onClick={() => recordBall(0, "no ball")}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl font-black text-[10px] bg-orange-900/60 hover:bg-orange-800/80 text-orange-400 border border-orange-700/40"
            >
              NB
            </button>
            <button
              onClick={() => recordBall(0, "bye")}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl font-black text-[9px] bg-[#1d3557] hover:bg-[#457b9d]/60 text-[#a8dadc]/70 border border-[#457b9d]/30"
            >
              BYE
            </button>
            <div className="w-px h-10 bg-[#457b9d]/20" />
            <button
              onClick={() => setShowWicket(true)}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl font-black text-sm bg-[#e63946] hover:bg-[#c1121f] text-white border border-[#e63946]/60"
            >
              W
            </button>
            <div className="w-px h-10 bg-[#457b9d]/20" />
            <button
              onClick={() => setShowBowler(true)}
              className="h-11 sm:h-12 px-3 rounded-xl font-black text-[9px] bg-[#0f1e32] hover:bg-[#1d3557] text-[#4ade80]/70 border border-[#4ade80]/20 uppercase tracking-wider"
            >
              Bowler
            </button>
            <button
              onClick={() => setShowStriker(true)}
              className="h-11 sm:h-12 px-3 rounded-xl font-black text-[9px] bg-[#0f1e32] hover:bg-[#1d3557] text-[#e63946]/70 border border-[#e63946]/20 uppercase tracking-wider"
            >
              Set
            </button>
          </div>
        </motion.div>
      )}
           <AnimatePresence>
        {showBowler && (
          <div
            className="fixed inset-0 bg-black/75 flex items-end sm:items-center justify-center p-4 z-[70]"
            onClick={() => setShowBowler(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1d3557] rounded-2xl border border-[#457b9d]/40 w-full max-w-sm"
            >
              <div className="px-5 py-4 border-b border-[#457b9d]/20">
                <div className="text-[9px] font-black uppercase tracking-widest text-[#4ade80]/80">Select Bowler</div>
                <div className="text-xs text-[#a8dadc]/50">for over {curOver + 1}</div>
              </div>
              <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
                {getBowlers().map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setLocalBowler(p.id);
                      setShowBowler(false);
                      autoModalRef.current = false;
                    }}
                    className="w-full p-3 bg-[#0f1e32]/60 hover:bg-[#457b9d]/30 rounded-xl text-left"
                  >
                    <span className="text-sm font-bold text-[#f1faee]">{p.name}</span>
                  </button>
                ))}
              </div>
              <div className="p-3 border-t border-[#457b9d]/20">
                <button
                  onClick={() => setShowBowler(false)}
                  className="w-full py-2.5 rounded-xl border border-[#457b9d]/30 text-[#a8dadc]/60 text-xs font-black uppercase"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showStriker && (
          <div
            className="fixed inset-0 bg-black/75 flex items-end sm:items-center justify-center p-4 z-[70]"
            onClick={() => setShowStriker(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1d3557] rounded-2xl border border-[#457b9d]/40 w-full max-w-sm"
            >
              <div className="px-5 py-4 border-b border-[#457b9d]/20">
                <div className="text-[9px] font-black uppercase tracking-widest text-[#e63946]">On Strike</div>
                <div className="text-xs text-[#a8dadc]/50">Who is facing?</div>
              </div>
              <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
                {getBatsmen([localNonStriker]).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setLocalStriker(p.id);
                      setShowStriker(false);
                      if (!localNonStriker) setShowNonStr(true);
                    }}
                    className={`w-full p-3 rounded-xl text-left transition-all ${
                      p.id === localStriker
                        ? "bg-[#e63946]/20 border border-[#e63946]/40"
                        : "bg-[#0f1e32]/60 hover:bg-[#457b9d]/30"
                    }`}
                  >
                    <span className="text-sm font-bold text-[#f1faee]">{p.name}</span>
                  </button>
                ))}
              </div>
              <div className="p-3 border-t border-[#457b9d]/20">
                <button
                  onClick={() => setShowStriker(false)}
                  className="w-full py-2.5 rounded-xl border border-[#457b9d]/30 text-[#a8dadc]/60 text-xs font-black uppercase"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showNonStr && (
          <div
            className="fixed inset-0 bg-black/75 flex items-end sm:items-center justify-center p-4 z-[70]"
            onClick={() => setShowNonStr(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1d3557] rounded-2xl border border-[#457b9d]/40 w-full max-w-sm"
            >
              <div className="px-5 py-4 border-b border-[#457b9d]/20">
                <div className="text-[9px] font-black uppercase tracking-widest text-[#457b9d]">Non-Striker</div>
                <div className="text-xs text-[#a8dadc]/50">Who is at the other end?</div>
              </div>
              <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
                {getBatsmen([localStriker]).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setLocalNonStriker(p.id);
                      setShowNonStr(false);
                      if (!localBowler) setShowBowler(true);
                    }}
                    className={`w-full p-3 rounded-xl text-left transition-all ${
                      p.id === localNonStriker
                        ? "bg-[#457b9d]/30 border border-[#457b9d]/60"
                        : "bg-[#0f1e32]/60 hover:bg-[#457b9d]/30"
                    }`}
                  >
                    <span className="text-sm font-bold text-[#f1faee]">{p.name}</span>
                  </button>
                ))}
              </div>
              <div className="p-3 border-t border-[#457b9d]/20">
                <button
                  onClick={() => setShowNonStr(false)}
                  className="w-full py-2.5 rounded-xl border border-[#457b9d]/30 text-[#a8dadc]/60 text-xs font-black uppercase"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showWicket && (
          <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center p-4 z-[70]">
            <div className="bg-[#1d3557] rounded-2xl border border-[#e63946]/30 w-full max-w-sm">
              <div className="px-5 py-4 border-b border-[#e63946]/20">
                <div className="text-[9px] font-black uppercase tracking-widest text-[#e63946]">⚡ Wicket</div>
                <div className="text-xs text-[#a8dadc]/50">Dismissal details</div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-[9px] font-black text-[#a8dadc]/50 uppercase tracking-widest block mb-1.5">
                    Dismissed
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[localStriker, localNonStriker]
                      .filter(Boolean)
                      .map((id, idx) => (
                        <button
                          key={`${id}-${idx}`}   // ✅ unique key using id + index
                          onClick={() => setDismissedId(id!)}
                          className={`p-2.5 rounded-xl text-sm font-bold transition-all ${
                            dismissedId === id
                              ? "bg-[#e63946] text-white"
                              : "bg-[#0f1e32]/60 text-[#f1faee] border border-[#457b9d]/20 hover:bg-[#e63946]/20"
                          }`}
                        >
                          {players.find((p) => p.id === id)?.name}
                          {id === localStriker ? " ★" : ""}
                        </button>
                      ))}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-[#a8dadc]/50 uppercase tracking-widest block mb-1.5">
                    Dismissal
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {WKTS.map((w) => (
                      <button
                        key={w}
                        onClick={() => setWkType(w)}
                        className={`p-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                          wkType === w
                            ? "bg-[#e63946] text-white"
                            : "bg-[#0f1e32]/60 text-[#a8dadc]/70 border border-[#457b9d]/20 hover:bg-[#e63946]/15"
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-[#a8dadc]/50 uppercase tracking-widest block mb-1.5">
                    New Batsman {(st?.yetToBat.length ?? 0) === 0 && <span className="text-[#e63946]/60">(Last wicket)</span>}
                  </label>
                  {(st?.yetToBat.length ?? 0) > 0 ? (
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {st!.yetToBat.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setNewBatId(p.id)}
                          className={`w-full p-2.5 rounded-xl text-sm font-bold text-left transition-all ${
                            newBatId === p.id
                              ? "bg-[#457b9d] text-white"
                              : "bg-[#0f1e32]/60 text-[#f1faee] border border-[#457b9d]/20 hover:bg-[#457b9d]/30"
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-[#a8dadc]/40 italic p-2">All out — no new batsman</div>
                  )}
                </div>
              </div>
              <div className="p-4 pt-0 space-y-2">
                <button
                  onClick={() => {
                    if (!dismissedId || !wkType) {
                      alert("Select dismissed batsman and wicket type");
                      return;
                    }
                    if ((st?.yetToBat.length ?? 0) > 0 && !newBatId) {
                      alert("Select the new batsman");
                      return;
                    }
                    recordBall(0, null, true, wkType, dismissedId, newBatId ?? undefined);
                  }}
                  className="w-full py-3 bg-[#e63946] hover:bg-[#c1121f] text-white rounded-xl font-black text-sm uppercase tracking-wider transition-all active:scale-98"
                >
                  Confirm Wicket
                </button>
                <button
                  onClick={() => {
                    setShowWicket(false);
                    setWkType(null);
                    setDismissedId(null);
                    setNewBatId(null);
                  }}
                  className="w-full py-2.5 rounded-xl border border-[#457b9d]/30 text-[#a8dadc]/60 text-xs font-black uppercase"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}