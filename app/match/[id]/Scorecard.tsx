"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  over_number: number;
  ball_number: number;
  batsman_id: number | null;
  bowler_id: number | null;
  runs: number;
  extra_runs: number;
  is_wicket: boolean;
  wicket_type: string | null;
  extra_type: string | null;
}

const toCricketNotation = (overs: number): string => {
  const full = Math.floor(overs);
  const balls = Math.round((overs - full) * 6);
  return `${full}.${balls}`;
};

export default function Scorecard({
  matchId,
  teamA,
  teamALogo,
  teamB,
  teamBLogo,
  totalOvers,
  matchStatus,
  isOwner,
}: {
  matchId: number;
  teamA: string;
  teamALogo?: string;
  teamB: string;
  teamBLogo?: string;
  totalOvers: number;
  matchStatus: string;
  isOwner: boolean;
}) {
  // ----------------------------- State -----------------------------
  const [players, setPlayers] = useState<Player[]>([]);
  const [allInnings, setAllInnings] = useState<Innings[]>([]);
  const [currentInnings, setCurrentInnings] = useState<Innings | null>(null);
  const [ballEvents, setBallEvents] = useState<BallEvent[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [strikerId, setStrikerId] = useState<number | null>(null);
  const [nonStrikerId, setNonStrikerId] = useState<number | null>(null);
  const [bowlerId, setBowlerId] = useState<number | null>(null);
  const [showBowlerSelect, setShowBowlerSelect] = useState(false);
  const [showWicketSelect, setShowWicketSelect] = useState(false);
  const [showStrikerSelect, setShowStrikerSelect] = useState(false);
  const [showNonStrikerSelect, setShowNonStrikerSelect] = useState(false);
  const [viewInningsId, setViewInningsId] = useState<number | null>(null);
  const [viewBallEvents, setViewBallEvents] = useState<BallEvent[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Derived data
  const displayedBallEvents = viewInningsId === currentInnings?.id ? ballEvents : viewBallEvents;
  const displayedInnings = viewInningsId === currentInnings?.id ? currentInnings : allInnings.find(i => i.id === viewInningsId) || null;

  // Helper functions
  const inningsIsCompleted = useCallback(
    (innings: Innings) => {
      const battingTeamPlayers = players.filter((p) => p.team === innings.batting_team);
      const maxWickets = Math.max(battingTeamPlayers.length - 1, 0);
      const completedWickets = Math.max(innings.total_wickets ?? 0, 0);
      return completedWickets >= maxWickets || innings.overs >= totalOvers;
    },
    [players, totalOvers]
  );

  const currentInningsCompleted = currentInnings ? inningsIsCompleted(currentInnings) : false;

  const availableBatsmen = useCallback(() => {
    if (!currentInnings) return [];
    const battingTeamPlayers = players.filter(p => p.team === currentInnings.batting_team);
    const outBatsmanIds = ballEvents.filter(b => b.is_wicket).map(b => b.batsman_id);
    return battingTeamPlayers.filter(p => !outBatsmanIds.includes(p.id));
  }, [currentInnings, players, ballEvents]);

  // ----------------------------- Data fetching -----------------------------
  const refreshData = useCallback(async (showUpdating = true) => {
    if (showUpdating) setUpdating(true);
    try {
      const [playersRes, inningsRes] = await Promise.all([
        fetch(`/api/players?matchId=${matchId}`).then((r) => r.json()),
        fetch(`/api/innings?matchId=${matchId}`).then((r) => r.json()),
      ]);
      setPlayers(playersRes);
      setAllInnings(inningsRes);
      if (inningsRes.length > 0) {
        const inn = inningsRes[inningsRes.length - 1];
        inn.overs = Number(inn.overs) || 0;
        setCurrentInnings(inn);
        const balls = await fetch(`/api/score?inningsId=${inn.id}`).then((r) => r.json());
        setBallEvents(balls);
        if (viewInningsId === null) setViewInningsId(inn.id);
      } else {
        setCurrentInnings(null);
        setBallEvents([]);
      }
    } catch (err) {
      console.error(err);
    }
    if (showUpdating) setUpdating(false);
  }, [matchId, viewInningsId]);

  // Auto‑complete match when second innings ends
  useEffect(() => {
    if (!isOwner) return;
    if (allInnings.length === 2 && currentInningsCompleted && matchStatus !== "completed") {
      const finishMatchAuto = async () => {
        try {
          await fetch("/api/matches", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: matchId, status: "completed" }),
          });
          window.location.reload();
        } catch (err) {
          console.error(err);
        }
      };
      finishMatchAuto();
    }
  }, [allInnings.length, currentInningsCompleted, matchStatus, matchId, isOwner]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);
      await refreshData(false);
      setInitialLoading(false);
    };
    init();
  }, [refreshData]);

  // Load ball events for selected non‑current innings
  useEffect(() => {
    if (viewInningsId && viewInningsId !== currentInnings?.id) {
      const load = async () => {
        const balls = await fetch(`/api/score?inningsId=${viewInningsId}`).then((r) => r.json());
        setViewBallEvents(balls);
      };
      load();
    }
  }, [viewInningsId, currentInnings]);

  // Real‑time subscription
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("pusher-js").then((Pusher) => {
        const pusher = new Pusher.default(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });
        const channel = pusher.subscribe(`match-${matchId}`);
        channel.bind("score-update", () => refreshData(true));
        return () => {
          pusher.unsubscribe(`match-${matchId}`);
        };
      });
    }
  }, [matchId, refreshData]);

  // Show striker selection modal only for owner and when needed
  useEffect(() => {
    if (!isOwner) return;
    if (!currentInnings || initialLoading || updating) return;
    if (currentInningsCompleted) return;
    if (strikerId === null && availableBatsmen().length > 0) {
      setShowStrikerSelect(true);
    }
  }, [currentInnings, strikerId, availableBatsmen, initialLoading, updating, currentInningsCompleted, isOwner]);

  // Rotate strike
  const rotateStrike = useCallback(() => {
    setStrikerId(nonStrikerId);
    setNonStrikerId(strikerId);
  }, [strikerId, nonStrikerId]);

  // Stats calculation
  const { batsmanMap, bowlerMap, extras, partnership } = useMemo(() => {
    const batMap = new Map<number, { runs: number; balls: number; fours: number; sixes: number }>();
    const bowlMap = new Map<number, { runs: number; wickets: number; legal: number; maidens: number }>();
    let totalExtras = 0;
    let partnershipRuns = 0;
    let partnershipBalls = 0;

    displayedBallEvents.forEach((ball) => {
      if (ball.batsman_id) {
        const cur = batMap.get(ball.batsman_id) || { runs: 0, balls: 0, fours: 0, sixes: 0 };
        cur.runs += ball.runs + (ball.extra_type === "bye" ? 0 : ball.extra_runs);
        if (!ball.extra_type || ball.extra_type === "bye") {
          cur.balls++;
          if (ball.runs === 4) cur.fours++;
          if (ball.runs === 6) cur.sixes++;
        }
        batMap.set(ball.batsman_id, cur);
        if (ball.batsman_id === strikerId || ball.batsman_id === nonStrikerId) {
          partnershipRuns += ball.runs + (ball.extra_type === "bye" ? 0 : ball.extra_runs);
          if (!ball.extra_type || ball.extra_type === "bye") partnershipBalls++;
        }
      }
      if (ball.bowler_id) {
        const cur = bowlMap.get(ball.bowler_id) || { runs: 0, wickets: 0, legal: 0, maidens: 0 };
        cur.runs += ball.runs + ball.extra_runs;
        if (ball.is_wicket) cur.wickets++;
        if (!ball.extra_type || (ball.extra_type !== "wide" && ball.extra_type !== "no ball"))
          cur.legal++;
        bowlMap.set(ball.bowler_id, cur);
      }
      totalExtras += ball.extra_runs;
    });

    for (let [bowlerId, stats] of bowlMap.entries()) {
      const oversBowled = stats.legal / 6;
      let maidens = 0;
      for (let overNum = 0; overNum < Math.floor(oversBowled); overNum++) {
        const ballsInOver = displayedBallEvents.filter(
          (b) =>
            b.bowler_id === bowlerId &&
            b.over_number === overNum &&
            (!b.extra_type || (b.extra_type !== "wide" && b.extra_type !== "no ball"))
        );
        if (ballsInOver.length === 6 && ballsInOver.every((b) => b.runs === 0 && b.extra_runs === 0))
          maidens++;
      }
      stats.maidens = maidens;
    }
    return { batsmanMap: batMap, bowlerMap: bowlMap, extras: totalExtras, partnership: { runs: partnershipRuns, balls: partnershipBalls } };
  }, [displayedBallEvents, strikerId, nonStrikerId]);

  // Match winner
  const matchWinner = useMemo(() => {
    if (allInnings.length !== 2) return null;
    const first = allInnings[0];
    const second = allInnings[1];
    if (!inningsIsCompleted(second)) return null;
    const firstRuns = first.total_runs;
    const secondRuns = second.total_runs;
    if (secondRuns > firstRuns) {
      const winnerTeam = second.batting_team === "team_a" ? teamA : teamB;
      const wicketsMargin = (players.filter(p => p.team === second.batting_team).length - 1) - second.total_wickets;
      return `${winnerTeam} won by ${wicketsMargin} wickets`;
    } else if (firstRuns > secondRuns) {
      const winnerTeam = first.batting_team === "team_a" ? teamA : teamB;
      return `${winnerTeam} won by ${firstRuns - secondRuns} runs`;
    } else {
      return "Match Tied";
    }
  }, [allInnings, players, teamA, teamB, inningsIsCompleted]);

  const isMatchCompleted = matchStatus === "completed";

  // ----------------------------- Record ball -----------------------------
  const recordBall = async (runs: number, extraType: string | null = null, isWicket = false, wicketType: string | null = null) => {
    if (!isOwner) return;
    if (!currentInnings || isMatchCompleted || currentInningsCompleted) return;
    if (!strikerId || !bowlerId) {
      if (!bowlerId) setShowBowlerSelect(true);
      else alert("Select striker and non‑striker first!");
      return;
    }
    setSubmitting(true);
    try {
      const legalBalls = ballEvents.filter(b => !b.extra_type || (b.extra_type !== "wide" && b.extra_type !== "no ball")).length;
      const nextOver = Math.floor(legalBalls / 6);
      const nextBall = (legalBalls % 6) + 1;

      const payload = {
        innings_id: currentInnings.id,
        over_number: nextOver,
        ball_number: nextBall,
        batsman_id: strikerId,
        bowler_id: bowlerId,
        runs,
        is_wicket: isWicket,
        wicket_type: wicketType,
        extra_type: extraType,
        extra_runs: extraType ? (extraType === "wide" || extraType === "no ball" ? 1 : 0) : 0,
      };
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await refreshData(true);
        if (!extraType || extraType === "bye") {
          if (runs % 2 === 1) rotateStrike();
        }
        if (isWicket) {
          setStrikerId(null);
          setShowWicketSelect(false);
          if (isOwner) setShowStrikerSelect(true);
        }
        const newLegalCount = ballEvents.filter(b => !b.extra_type || (b.extra_type !== "wide" && b.extra_type !== "no ball")).length + (extraType ? 0 : 1);
        if (newLegalCount % 6 === 0) {
          rotateStrike();
          setShowBowlerSelect(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const undoLastBall = async () => {
    if (!isOwner) return;
    if (!currentInnings || ballEvents.length === 0 || isMatchCompleted) return;
    if (!confirm("Undo last ball?")) return;
    setUndoing(true);
    try {
      const res = await fetch(`/api/score?inningsId=${currentInnings.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) await refreshData(true);
    } catch (err) { console.error(err); }
    setUndoing(false);
  };

  const resetInnings = async () => {
    if (!isOwner) return;
    if (!currentInnings) return;
    if (!confirm("⚠️ WARNING: This will delete ALL ball events for this innings and reset runs, wickets, and overs to 0. This action cannot be undone. Are you absolutely sure?")) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/score?inningsId=${currentInnings.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        await refreshData(true);
        setStrikerId(null);
        setNonStrikerId(null);
        setBowlerId(null);
        setShowBowlerSelect(false);
        setShowWicketSelect(false);
        setShowStrikerSelect(false);
        setShowNonStrikerSelect(false);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to reset innings");
      }
    } catch (err) {
      console.error(err);
      alert("Network error while resetting innings");
    }
    setResetting(false);
  };

  const finishMatch = async () => {
    if (!isOwner) return;
    if (!confirm("Mark this match as completed?")) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/matches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: matchId, status: "completed" }),
      });
      if (res.ok) window.location.reload();
    } catch (err) { console.error(err); }
    setSubmitting(false);
  };

  const startSecondInnings = async () => {
    if (!isOwner) return;
    if (!confirm("Start second innings? Batting/Bowling teams will be swapped.")) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/innings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId }),
      });
      if (res.ok) {
        await refreshData(true);
        setStrikerId(null);
        setNonStrikerId(null);
        setBowlerId(null);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to start second innings");
      }
    } catch (err) { console.error(err); }
    setSubmitting(false);
  };

  // ----------------------------- Render -----------------------------
  if (initialLoading) return <div className="text-center py-20 text-[#a8dadc]">Loading scorecard...</div>;
  if (!currentInnings) return <div className="text-center py-20 text-[#a8dadc]">Waiting for toss...</div>;

  const displayedBattingTeamName = displayedInnings?.batting_team === "team_a" ? teamA : teamB;
  const displayedBattingTeamLogo = displayedInnings?.batting_team === "team_a" ? teamALogo : teamBLogo;
  const displayedBattingTeamPlayers = players.filter(p => p.team === displayedInnings?.batting_team);
  const displayedBowlingTeamPlayers = players.filter(p => p.team === displayedInnings?.bowling_team);

  const battingRows = displayedBattingTeamPlayers.map((p) => {
    const stats = batsmanMap.get(p.id) || { runs: 0, balls: 0, fours: 0, sixes: 0 };
    const sr = stats.balls ? ((stats.runs / stats.balls) * 100).toFixed(1) : "0.0";
    const out = displayedBallEvents.some((b) => b.batsman_id === p.id && b.is_wicket);
    const isStriker = p.id === strikerId && viewInningsId === currentInnings?.id;
    const isNonStriker = p.id === nonStrikerId && viewInningsId === currentInnings?.id;
    return { name: p.name, runs: stats.runs, balls: stats.balls, fours: stats.fours, sixes: stats.sixes, sr, out, isStriker, isNonStriker };
  });

  const bowlingRows = displayedBowlingTeamPlayers.map((p) => {
    const stats = bowlerMap.get(p.id) || { runs: 0, wickets: 0, legal: 0, maidens: 0 };
    const overs = stats.legal / 6;
    const econ = overs > 0 ? (stats.runs / overs).toFixed(2) : "0.00";
    return { name: p.name, overs: toCricketNotation(overs), maidens: stats.maidens, runs: stats.runs, wickets: stats.wickets, econ };
  });

  const oversMap = new Map<number, BallEvent[]>();
  displayedBallEvents.forEach((ball) => {
    if (!oversMap.has(ball.over_number)) oversMap.set(ball.over_number, []);
    oversMap.get(ball.over_number)!.push(ball);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32">
      {updating && (
        <div className="fixed top-4 right-4 bg-black/50 text-white text-xs px-3 py-1 rounded-full z-50">
          Updating...
        </div>
      )}

      {allInnings.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <label className="text-[#a8dadc]">Innings:</label>
          <select
            value={viewInningsId ?? ''}
            onChange={(e) => setViewInningsId(Number(e.target.value))}
            className="bg-[#1d3557] text-[#f1faee] rounded px-2 py-1"
          >
            {allInnings.map((inn) => (
              <option key={inn.id} value={inn.id}>
                {inn.innings_number} – {inn.batting_team === "team_a" ? teamA : teamB}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Winner Banner */}
      <AnimatePresence>
        {isMatchCompleted && matchWinner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#1d3557] to-[#457b9d] p-8 rounded-3xl text-center border border-[#e63946]/30 shadow-2xl"
          >
            <div className="text-[#a8dadc] text-xs font-black uppercase tracking-[0.4em] mb-2">Match Completed</div>
            <div className="text-3xl font-black text-[#f1faee] italic">{matchWinner}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Scoreboard */}
      <div className="bg-[#1d3557]/90 backdrop-blur-sm rounded-3xl p-8 border border-[#457b9d]/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-[#1d3557] rounded-2xl flex items-center justify-center overflow-hidden border border-[#457b9d] shadow-inner">
              {displayedBattingTeamLogo ? (
                <img src={displayedBattingTeamLogo} alt={displayedBattingTeamName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black text-[#a8dadc]/20 italic">LIVE</span>
              )}
            </div>
            <div>
              <div className="text-[#a8dadc] text-[10px] font-black uppercase tracking-widest mb-1">{displayedBattingTeamName} Batting</div>
              <div className="flex items-baseline gap-2">
                <span className="text-7xl font-black text-[#f1faee] tracking-tighter leading-none">{displayedInnings?.total_runs || 0}</span>
                <span className="text-4xl font-black text-[#e63946] pb-1">/{displayedInnings?.total_wickets || 0}</span>
              </div>
              <div className="text-sm font-bold text-[#a8dadc]/60 mt-2">
                {toCricketNotation(displayedInnings?.overs || 0)} / {totalOvers} overs
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center lg:items-end gap-4">
            <div className="flex gap-4">
              <div className="bg-[#1d3557] px-6 py-3 rounded-2xl border border-[#457b9d]/30 text-center">
                <div className="text-[10px] text-[#a8dadc] font-black uppercase mb-1">Target</div>
                <div className="text-2xl font-black text-[#f1faee]">
                  {allInnings.length > 1 ? allInnings[0].total_runs + 1 : "—"}
                </div>
              </div>
              <div className="bg-[#1d3557] px-6 py-3 rounded-2xl border border-[#457b9d]/30 text-center">
                <div className="text-[10px] text-[#a8dadc] font-black uppercase mb-1">Innings</div>
                <div className="text-2xl font-black text-[#e63946]">{displayedInnings?.innings_number === 1 ? "1ST" : "2ND"}</div>
              </div>
            </div>

            {/* Admin Controls */}
            {isOwner && !isMatchCompleted && (
              <div className="flex flex-wrap gap-3 justify-center lg:justify-end">
                {currentInningsCompleted && allInnings.length === 1 && (
                  <button
                    onClick={startSecondInnings}
                    disabled={submitting}
                    className="px-6 py-2 bg-[#e63946] text-[#f1faee] font-black text-xs uppercase rounded-full hover:bg-[#c1121f] transition-all shadow-lg"
                  >
                    Start 2nd Innings
                  </button>
                )}
                <button
                  onClick={resetInnings}
                  disabled={resetting}
                  className="px-6 py-2 bg-red-800/80 border border-red-500 text-red-300 font-black text-xs uppercase rounded-full hover:bg-red-700 hover:text-white transition-all"
                >
                  {resetting ? "Resetting..." : "Reset Inning"}
                </button>
                <button
                  onClick={finishMatch}
                  className="px-6 py-2 bg-[#1d3557] border border-[#e63946]/50 text-[#e63946] font-black text-xs uppercase rounded-full hover:bg-[#e63946] hover:text-white transition-all"
                >
                  Finish Match
                </button>
                <button
                  onClick={undoLastBall}
                  disabled={undoing}
                  className="px-6 py-2 bg-[#457b9d] text-[#f1faee] font-black text-xs uppercase rounded-full hover:bg-[#1d3557] transition-all"
                >
                  Undo Last Ball
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batting & Bowling Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#1d3557]/50 backdrop-blur-sm rounded-3xl p-6 border border-[#457b9d]/30">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#e63946] mb-4">Batting</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[#a8dadc] text-[10px] font-black uppercase border-b border-[#457b9d]/30">
                <tr>
                  <th className="text-left py-2">Batter</th>
                  <th className="text-center">R</th>
                  <th className="text-center">B</th>
                  <th className="text-center">4s</th>
                  <th className="text-center">6s</th>
                  <th className="text-center">SR</th>
                </tr>
              </thead>
              <tbody>
                {battingRows.map((b, i) => (
                  <tr key={i} className="border-b border-[#457b9d]/20 hover:bg-[#1d3557]/30 transition-colors">
                    <td className="py-2 font-bold text-[#f1faee]">
                      {b.name}
                      {b.isStriker && <span className="text-[#e63946] ml-1">*</span>}
                      {b.isNonStriker && <span className="text-[#e63946] ml-1">(NS)</span>}
                      {b.out && <span className="text-[#e63946] text-[10px] ml-2">(out)</span>}
                    </td>
                    <td className="text-center text-white">{b.runs}</td>
                    <td className="text-center text-white">{b.balls}</td>
                    <td className="text-center text-[#a8dadc]">{b.fours}</td>
                    <td className="text-center text-[#a8dadc]">{b.sixes}</td>
                    <td className="text-center text-[#e63946]">{b.sr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#1d3557]/50 backdrop-blur-sm rounded-3xl p-6 border border-[#457b9d]/30">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#e63946] mb-4">Bowling</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[#a8dadc] text-[10px] font-black uppercase border-b border-[#457b9d]/30">
                <tr>
                  <th className="text-left py-2">Bowler</th>
                  <th className="text-center">O</th>
                  <th className="text-center">M</th>
                  <th className="text-center">R</th>
                  <th className="text-center">W</th>
                  <th className="text-center">Econ</th>
                </tr>
              </thead>
              <tbody>
                {bowlingRows.map((b, i) => (
                  <tr key={i} className="border-b border-[#457b9d]/20 hover:bg-[#1d3557]/30 transition-colors">
                    <td className="py-2 font-bold text-[#f1faee]">{b.name}</td>
                    <td className="text-center text-white">{b.overs}</td>
                    <td className="text-center text-white">{b.maidens}</td>
                    <td className="text-center text-white">{b.runs}</td>
                    <td className="text-center text-[#e63946] font-bold">{b.wickets}</td>
                    <td className="text-center text-[#a8dadc]">{b.econ}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ball‑by‑Ball */}
      <div className="bg-[#1d3557]/40 rounded-3xl p-6 border border-[#457b9d]/30">
        <h3 className="text-xs font-black uppercase tracking-widest text-[#e63946] mb-4">Ball by Ball</h3>
        <div className="grid sm:grid-cols-2 gap-6">
          {Array.from(oversMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([over, balls]) => (
              <div key={over} className="bg-[#1d3557] rounded-2xl p-4 border border-[#457b9d]/30">
                <div className="text-[#e63946] font-bold mb-2">Over {over}</div>
                <div className="space-y-1 text-sm">
                  {balls.map((ball, idx) => {
                    let outcome = "";
                    if (ball.is_wicket) outcome = `⚡ ${ball.wicket_type || "Wicket"}`;
                    else if (ball.extra_type) outcome = `${ball.extra_type.toUpperCase()} ${ball.extra_runs > 0 ? `+${ball.extra_runs}` : ""}`;
                    else outcome = `${ball.runs} run${ball.runs !== 1 ? "s" : ""}`;
                    const bowler = players.find(p => p.id === ball.bowler_id)?.name;
                    return (
                      <div key={idx} className="flex justify-between items-center border-b border-[#457b9d]/20 py-1">
                        <span className="text-[#f1faee]">{outcome}</span>
                        <span className="text-[#a8dadc] text-xs">from {bowler}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Match Summary */}
      {isMatchCompleted && allInnings.length === 2 && (
        <div className="bg-[#1d3557]/80 rounded-3xl p-8 border border-[#e63946]/30 text-center space-y-4">
          <div className="text-[#a8dadc] text-xs font-black uppercase tracking-widest">Match Summary</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-[#e63946] font-bold text-lg mb-1">{teamA}</div>
              <div className="text-3xl font-black text-[#f1faee]">
                {allInnings[0].total_runs}/{allInnings[0].total_wickets}
              </div>
              <div className="text-xs text-[#a8dadc] mt-1">{toCricketNotation(allInnings[0].overs)} overs</div>
            </div>
            <div>
              <div className="text-[#e63946] font-bold text-lg mb-1">{teamB}</div>
              <div className="text-3xl font-black text-[#f1faee]">
                {allInnings[1].total_runs}/{allInnings[1].total_wickets}
              </div>
              <div className="text-xs text-[#a8dadc] mt-1">{toCricketNotation(allInnings[1].overs)} overs</div>
            </div>
          </div>
          <div className="text-xl font-bold text-[#f1faee] mt-4">{matchWinner}</div>
        </div>
      )}

      {/* Floating Scoring Buttons - only for owner */}
      {isOwner && !isMatchCompleted && !currentInningsCompleted && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1d3557]/90 backdrop-blur-xl border border-[#e63946]/30 p-4 rounded-2xl shadow-2xl flex gap-3 z-50"
        >
          {[0, 1, 2, 3, 4, 6].map((r) => (
            <button
              key={r}
              onClick={() => recordBall(r)}
              disabled={submitting}
              className="w-14 h-14 bg-[#457b9d] text-[#f1faee] rounded-xl font-black text-2xl hover:bg-[#e63946] transition-all"
            >
              {r}
            </button>
          ))}
          <button
            onClick={() => recordBall(0, "wide", false)}
            className="w-14 h-14 bg-[#457b9d] text-[#f1faee] rounded-xl font-black text-lg hover:bg-[#e63946]"
          >
            WD
          </button>
          <button
            onClick={() => recordBall(0, "no ball", false)}
            className="w-14 h-14 bg-[#457b9d] text-[#f1faee] rounded-xl font-black text-lg hover:bg-[#e63946]"
          >
            NB
          </button>
          <button
            onClick={() => setShowWicketSelect(true)}
            className="w-14 h-14 bg-red-600 text-white rounded-xl font-black text-sm uppercase hover:bg-red-700"
          >
            W
          </button>
          <button
            onClick={rotateStrike}
            className="w-14 h-14 bg-[#1d3557] text-[#a8dadc] rounded-xl font-black text-xs uppercase hover:bg-[#457b9d] transition-all"
          >
            Swap
          </button>
          <button
            onClick={() => setShowStrikerSelect(true)}
            className="w-14 h-14 bg-[#1d3557] text-[#a8dadc] rounded-xl font-black text-xs uppercase hover:bg-[#457b9d] transition-all"
          >
            Set
          </button>
        </motion.div>
      )}

      {/* Bowler Selection Modal - only for owner */}
      {isOwner && (
        <AnimatePresence>
          {showBowlerSelect && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-[60]">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#1d3557] p-8 rounded-3xl border border-[#e63946]/30 max-w-md w-full"
              >
                <h2 className="text-xl font-black uppercase tracking-tighter mb-6 text-[#e63946]">Select Bowler</h2>
                <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {displayedBowlingTeamPlayers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setBowlerId(p.id); setShowBowlerSelect(false); }}
                      className="p-4 bg-[#457b9d] rounded-2xl text-left font-bold text-[#f1faee] hover:bg-[#e63946] transition-all"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowBowlerSelect(false)}
                  className="mt-6 w-full py-3 bg-transparent border border-[#a8dadc] rounded-xl text-[#a8dadc] font-black text-sm uppercase hover:bg-[#a8dadc] hover:text-[#1d3557] transition-all"
                >
                  Cancel
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}

      {/* Striker Selection Modal - only for owner */}
      {isOwner && (
        <AnimatePresence>
          {showStrikerSelect && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-[60]">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#1d3557] p-8 rounded-3xl border border-[#e63946]/30 max-w-md w-full"
              >
                <h2 className="text-xl font-black uppercase tracking-tighter mb-6 text-[#e63946]">Select Striker</h2>
                <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {availableBatsmen().map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setStrikerId(p.id);
                        setShowStrikerSelect(false);
                        if (nonStrikerId === null && availableBatsmen().length > 1) {
                          setShowNonStrikerSelect(true);
                        }
                      }}
                      className="p-4 bg-[#457b9d] rounded-2xl text-left font-bold text-[#f1faee] hover:bg-[#e63946] transition-all"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowStrikerSelect(false)}
                  className="mt-6 w-full py-3 bg-transparent border border-[#a8dadc] rounded-xl text-[#a8dadc] font-black text-sm uppercase hover:bg-[#a8dadc] hover:text-[#1d3557] transition-all"
                >
                  Cancel
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}

      {/* Non‑Striker Selection Modal - only for owner */}
      {isOwner && (
        <AnimatePresence>
          {showNonStrikerSelect && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-[60]">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#1d3557] p-8 rounded-3xl border border-[#e63946]/30 max-w-md w-full"
              >
                <h2 className="text-xl font-black uppercase tracking-tighter mb-6 text-[#e63946]">Select Non‑Striker</h2>
                <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {availableBatsmen()
                    .filter(p => p.id !== strikerId)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setNonStrikerId(p.id);
                          setShowNonStrikerSelect(false);
                        }}
                        className="p-4 bg-[#457b9d] rounded-2xl text-left font-bold text-[#f1faee] hover:bg-[#e63946] transition-all"
                      >
                        {p.name}
                      </button>
                    ))}
                </div>
                <button
                  onClick={() => setShowNonStrikerSelect(false)}
                  className="mt-6 w-full py-3 bg-transparent border border-[#a8dadc] rounded-xl text-[#a8dadc] font-black text-sm uppercase hover:bg-[#a8dadc] hover:text-[#1d3557] transition-all"
                >
                  Cancel
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}

      {/* Wicket Modal - only for owner */}
      {isOwner && (
        <AnimatePresence>
          {showWicketSelect && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-[60]">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#1d3557] p-8 rounded-3xl border border-[#e63946]/30 max-w-md w-full"
              >
                <h2 className="text-xl font-black uppercase tracking-tighter mb-6 text-[#e63946]">Select Wicket Type</h2>
                <div className="grid grid-cols-2 gap-3">
                  {["bowled", "caught", "lbw", "run out", "stumped", "hit wicket"].map((w) => (
                    <button
                      key={w}
                      onClick={() => recordBall(0, null, true, w)}
                      className="p-4 bg-red-900/40 text-red-400 rounded-2xl font-bold uppercase text-xs tracking-wider hover:bg-red-600 hover:text-white transition-all border border-red-500/30"
                    >
                      {w}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowWicketSelect(false)}
                    className="col-span-2 mt-2 p-4 bg-[#457b9d] text-[#f1faee] rounded-2xl font-bold uppercase text-sm hover:bg-[#a8dadc] hover:text-[#1d3557] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}