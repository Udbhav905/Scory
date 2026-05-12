"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Player { id: number; name: string; team: string; }
interface Innings { id: number; innings_number: number; batting_team: string; bowling_team: string; total_runs: number; total_wickets: number; overs: number; }
interface BallEvent { id: number; over_number: number; ball_number: number; batsman_id: number | null; bowler_id: number | null; runs: number; extra_runs: number; is_wicket: boolean; wicket_type: string | null; extra_type: string | null; }

export default function Scorecard({ matchId, teamA, teamB, totalOvers }: { matchId: number; teamA: string; teamB: string; totalOvers: number }) {
  // State
  const [players, setPlayers] = useState<Player[]>([]);
  const [allInnings, setAllInnings] = useState<Innings[]>([]);
  const [currentInnings, setCurrentInnings] = useState<Innings | null>(null);
  const [ballEvents, setBallEvents] = useState<BallEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [strikerId, setStrikerId] = useState<number | null>(null);
  const [nonStrikerId, setNonStrikerId] = useState<number | null>(null);
  const [bowlerId, setBowlerId] = useState<number | null>(null);
  const [showBowlerSelect, setShowBowlerSelect] = useState(false);
  const [showWicketSelect, setShowWicketSelect] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [undoing, setUndoing] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [playersRes, inningsRes] = await Promise.all([
        fetch(`/api/players?matchId=${matchId}`).then(r => r.json()),
        fetch(`/api/innings?matchId=${matchId}`).then(r => r.json())
      ]);
      setPlayers(playersRes);
      setAllInnings(inningsRes);
      if (inningsRes.length > 0) {
        // Use the latest innings
        const inn = inningsRes[inningsRes.length - 1];
        inn.overs = Number(inn.overs) || 0;
        setCurrentInnings(inn);
        const balls = await fetch(`/api/score?inningsId=${inn.id}`).then(r => r.json());
        setBallEvents(balls);
      } else {
        setCurrentInnings(null);
        setBallEvents([]);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [matchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const startSecondInnings = async () => {
    if (!confirm("Start second innings? Batting/Bowling teams will be swapped.")) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/innings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId }),
      });
      if (res.ok) {
        await fetchData();
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

  // Auto‑select first two batsmen at start
  useEffect(() => {
    if (!currentInnings || loading || ballEvents.length > 0) return;
    const battingTeamPlayers = players.filter(p => p.team === currentInnings.batting_team);
    if (battingTeamPlayers.length < 2) return;
    if (strikerId === null && nonStrikerId === null) {
      setStrikerId(battingTeamPlayers[0].id);
      setNonStrikerId(battingTeamPlayers[1].id);
    }
  }, [currentInnings, players, ballEvents.length, strikerId, nonStrikerId, loading]);

  // Helper functions
  const toCricketNotation = (oversDecimal: number) => {
    const fullOvers = Math.floor(oversDecimal);
    const balls = Math.round((oversDecimal - fullOvers) * 6);
    return `${fullOvers}.${balls}`;
  };

  const getNextBallPosition = useCallback(() => {
    if (ballEvents.length === 0) return { over: 0, ball: 1 };
    const lastBall = ballEvents[ballEvents.length - 1];
    const lastOver = lastBall.over_number;
    
    const legalBallsInLastOver = ballEvents.filter(b => b.over_number === lastOver && (!b.extra_type || (b.extra_type !== 'wide' && b.extra_type !== 'no ball'))).length;
    const totalBallsInLastOver = ballEvents.filter(b => b.over_number === lastOver).length;

    if (legalBallsInLastOver >= 6) {
      return { over: lastOver + 1, ball: 1 };
    } else {
      return { over: lastOver, ball: totalBallsInLastOver + 1 };
    }
  }, [ballEvents]);

  const rotateStrike = useCallback(() => {
    setStrikerId(nonStrikerId);
    setNonStrikerId(strikerId);
  }, [strikerId, nonStrikerId]);

  // Stats
  const { batsmanMap, bowlerMap, extras, partnership } = useMemo(() => {
    const batMap = new Map<number, { runs: number; balls: number; fours: number; sixes: number }>();
    const bowlMap = new Map<number, { runs: number; wickets: number; legal: number; maidens: number }>();
    let totalExtras = 0;
    let partnershipRuns = 0;
    let partnershipBalls = 0;

    ballEvents.forEach(ball => {
      if (ball.batsman_id) {
        const cur = batMap.get(ball.batsman_id) || { runs: 0, balls: 0, fours: 0, sixes: 0 };
        cur.runs += ball.runs + (ball.extra_type === 'bye' ? 0 : ball.extra_runs);
        if (!ball.extra_type || ball.extra_type === 'bye') {
          cur.balls++;
          if (ball.runs === 4) cur.fours++;
          if (ball.runs === 6) cur.sixes++;
        }
        batMap.set(ball.batsman_id, cur);
        if (ball.batsman_id === strikerId || ball.batsman_id === nonStrikerId) {
          partnershipRuns += ball.runs + (ball.extra_type === 'bye' ? 0 : ball.extra_runs);
          if (!ball.extra_type || ball.extra_type === 'bye') partnershipBalls++;
        }
      }
      if (ball.bowler_id) {
        const cur = bowlMap.get(ball.bowler_id) || { runs: 0, wickets: 0, legal: 0, maidens: 0 };
        cur.runs += ball.runs + ball.extra_runs;
        if (ball.is_wicket) cur.wickets++;
        if (!ball.extra_type || (ball.extra_type !== 'wide' && ball.extra_type !== 'no ball')) cur.legal++;
        bowlMap.set(ball.bowler_id, cur);
      }
      totalExtras += ball.extra_runs;
    });
    // Compute maidens
    for (let [bowlerId, stats] of bowlMap.entries()) {
      const oversBowled = stats.legal / 6;
      let maidens = 0;
      for (let overNum = 0; overNum < Math.floor(oversBowled); overNum++) {
        const ballsInOver = ballEvents.filter(b => b.bowler_id === bowlerId && b.over_number === overNum && (!b.extra_type || (b.extra_type !== 'wide' && b.extra_type !== 'no ball')));
        if (ballsInOver.length === 6 && ballsInOver.every(b => b.runs === 0 && b.extra_runs === 0)) maidens++;
      }
      stats.maidens = maidens;
    }
    return { batsmanMap: batMap, bowlerMap: bowlMap, extras: totalExtras, partnership: { runs: partnershipRuns, balls: partnershipBalls } };
  }, [ballEvents, strikerId, nonStrikerId]);

  // Record ball
  const recordBall = async (params: { runs: number; extraType?: string; isWicket?: boolean; extraRuns?: number; wicketType?: string }) => {
    if (!currentInnings) return;
    if (!strikerId || !bowlerId) { alert("Select striker and bowler first!"); return; }
    if (submitting) return;

    const { runs, extraType = null, isWicket = false, extraRuns = 0, wicketType = null } = params;
    const isLegalDelivery = !extraType || (extraType !== 'wide' && extraType !== 'no ball');
    const { over, ball } = getNextBallPosition();

    setSubmitting(true);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          innings_id: currentInnings.id,
          over_number: over,
          ball_number: ball,
          batsman_id: strikerId,
          bowler_id: bowlerId,
          runs,
          is_wicket: isWicket,
          wicket_type: wicketType,
          extra_type: extraType,
          extra_runs: extraRuns,
        }),
      });
      if (!res.ok) throw new Error("Failed to record ball");

      // Refresh
      const updatedBalls = await fetch(`/api/score?inningsId=${currentInnings.id}`).then(r => r.json());
      setBallEvents(updatedBalls);
      const inningsRes = await fetch(`/api/innings?matchId=${matchId}`).then(r => r.json());
      const updatedInn = inningsRes.find((i: any) => i.id === currentInnings.id);
      setCurrentInnings({ ...updatedInn, overs: Number(updatedInn.overs) || 0 });

      // Strike rotation
      if (isLegalDelivery) {
        if (runs % 2 === 1) rotateStrike();
        const newLegalCount = updatedBalls.filter((b: { over_number: number; extra_type: string; }) => b.over_number === over && (!b.extra_type || (b.extra_type !== 'wide' && b.extra_type !== 'no ball'))).length;
        if (newLegalCount === 6) {
          rotateStrike();
          setShowBowlerSelect(true);
        }
      } else if (extraType === 'wide' || extraType === 'no ball') {
        if (runs % 2 === 1) rotateStrike();
      } else if (extraType === 'bye' || extraType === 'leg bye') {
        if (extraRuns % 2 === 1) rotateStrike();
      }

      if (isWicket) {
        setStrikerId(null);
        setShowWicketSelect(true);
      }
    } catch (err) { console.error(err); alert("Error recording ball"); }
    setSubmitting(false);
  };

  // Undo & reset
  const undoLastBall = async () => {
    if (!currentInnings || ballEvents.length === 0) return;
    if (!confirm("Undo last ball?")) return;
    setUndoing(true);
    try {
      const res = await fetch(`/api/score?inningsId=${currentInnings.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Undo failed");
      await fetchData();
    } catch (err) { console.error(err); alert("Undo failed"); }
    setUndoing(false);
  };

  const resetInnings = async () => {
    if (!currentInnings) return;
    if (!confirm("Reset this innings?")) return;
    const res = await fetch(`/api/innings/reset?inningsId=${currentInnings.id}`, { method: "DELETE" });
    if (res.ok) fetchData();
    else alert("Reset failed");
  };

  const resetFullMatch = async () => {
    if (!confirm("Reset entire match?")) return;
    const res = await fetch(`/api/innings/reset?matchId=${matchId}`, { method: "DELETE" });
    if (res.ok) window.location.reload();
    else alert("Reset failed");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading Scorecard...</div>;
  if (!currentInnings) return <div className="text-white text-center p-10">No active innings found.</div>;

  const battingTeamName = currentInnings.batting_team === "team_a" ? teamA : teamB;
  const bowlingTeamName = currentInnings.bowling_team === "team_a" ? teamA : teamB;
  const battingTeamPlayers = players.filter(p => p.team === currentInnings.batting_team);
  const bowlingTeamPlayers = players.filter(p => p.team === currentInnings.bowling_team);

  const strikerName = strikerId ? players.find(p => p.id === strikerId)?.name : "—";
  const nonStrikerName = nonStrikerId ? players.find(p => p.id === nonStrikerId)?.name : "—";
  const bowlerName = bowlerId ? players.find(p => p.id === bowlerId)?.name : "—";
  const strikerStats = strikerId ? batsmanMap.get(strikerId) || { runs: 0, balls: 0, fours: 0, sixes: 0 } : null;
  const nonStrikerStats = nonStrikerId ? batsmanMap.get(nonStrikerId) || { runs: 0, balls: 0, fours: 0, sixes: 0 } : null;
  const currentBowler = bowlerId ? bowlerMap.get(bowlerId) : null;
  const bowlerDisplay = currentBowler ? `${Math.floor(currentBowler.legal/6)}.${currentBowler.legal%6}-${currentBowler.runs}-${currentBowler.wickets}` : "0.0-0-0";

  const isInningsCompleted = currentInnings.total_wickets === 10 || currentInnings.overs >= totalOvers;

  // Batting & bowling tables
  const battingRows = battingTeamPlayers.map(p => {
    const stats = batsmanMap.get(p.id) || { runs: 0, balls: 0, fours: 0, sixes: 0 };
    const sr = stats.balls ? ((stats.runs / stats.balls) * 100).toFixed(1) : "0.0";
    const out = ballEvents.some(b => b.batsman_id === p.id && b.is_wicket);
    return { name: p.name, runs: stats.runs, balls: stats.balls, fours: stats.fours, sixes: stats.sixes, sr, out, wicketType: ballEvents.find(b => b.batsman_id === p.id && b.is_wicket)?.wicket_type };
  });

  const bowlingRows = bowlingTeamPlayers.map(p => {
    const stats = bowlerMap.get(p.id) || { runs: 0, wickets: 0, legal: 0, maidens: 0 };
    const overs = stats.legal / 6;
    const econ = overs > 0 ? (stats.runs / overs).toFixed(2) : "0.00";
    return { name: p.name, overs: toCricketNotation(overs), maidens: stats.maidens, runs: stats.runs, wickets: stats.wickets, econ };
  }).filter(r => r.overs !== "0.0" || r.runs > 0 || r.wickets > 0);

  // Ball by ball
  const oversMap = new Map<number, BallEvent[]>();
  ballEvents.forEach(ball => {
    if (!oversMap.has(ball.over_number)) oversMap.set(ball.over_number, []);
    oversMap.get(ball.over_number)!.push(ball);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-2xl p-6 border border-slate-700 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 text-8xl font-bold italic">LIVE</div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h2 className="text-slate-400 uppercase tracking-widest text-sm font-bold">{battingTeamName} {allInnings.length > 1 ? `(2nd Innings)` : `(1st Innings)`}</h2>
            <div className="flex items-baseline gap-3">
              <span className="text-7xl font-black text-white">{currentInnings.total_runs}</span>
              <span className="text-4xl font-bold text-slate-500">/ {currentInnings.total_wickets}</span>
            </div>
            <div className="text-slate-400 mt-2 font-mono text-lg">
              Overs: <span className="text-white font-bold">{toCricketNotation(currentInnings.overs)}</span> / {totalOvers}
            </div>
          </div>
          <div className="text-right">
            {isInningsCompleted && allInnings.length === 1 && (
              <button onClick={startSecondInnings} disabled={submitting} className="mb-4 px-6 py-2 bg-[#B5E18B] text-slate-900 font-bold rounded-full hover:bg-[#c8f0a2] transition-all transform hover:scale-105">START 2ND INNINGS</button>
            )}
            <div className="text-slate-400 text-xs uppercase mb-1">Run Rate</div>
            <div className="text-3xl font-mono text-[#B5E18B] font-bold">
              {(currentInnings.total_runs / Math.max(currentInnings.overs, 0.1)).toFixed(2)}
            </div>
            <button onClick={undoLastBall} disabled={undoing} className="mt-3 text-xs text-red-400 hover:text-red-300 flex items-center gap-1">↩ UNDO LAST BALL</button>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={resetInnings} className="px-3 py-1 text-xs bg-yellow-600/70 hover:bg-yellow-600 text-white rounded">Reset Innings</button>
          <button onClick={resetFullMatch} className="px-3 py-1 text-xs bg-red-700/70 hover:bg-red-700 text-white rounded">Reset Match</button>
        </div>
      </div>

      {isInningsCompleted && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 text-center text-red-200 font-bold uppercase tracking-widest">
          Innings Completed
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Live scoring */}
        {!isInningsCompleted ? (
          <div className="lg:col-span-2 space-y-6">
            {/* Current batsmen & bowler */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 relative">
                <div className="text-xs text-blue-400 font-bold uppercase">Striker</div>
                <div className="text-2xl font-bold text-white truncate">{strikerName}</div>
                <div className="text-xl font-mono text-[#B5E18B]">{strikerStats?.runs || 0} ({strikerStats?.balls || 0} balls)</div>
                <button onClick={() => setShowWicketSelect(true)} className="absolute top-2 right-2 text-xs text-blue-400 hover:underline">🔁</button>
              </div>
              <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 relative">
                <div className="text-xs text-slate-400 font-bold uppercase">Non‑Striker</div>
                <div className="text-2xl font-bold text-white truncate">{nonStrikerName}</div>
                <div className="text-xl font-mono text-[#B5E18B]">{nonStrikerStats?.runs || 0} ({nonStrikerStats?.balls || 0} balls)</div>
                <button onClick={() => setShowWicketSelect(true)} className="absolute top-2 right-2 text-xs text-blue-400 hover:underline">🔁</button>
              </div>
            </div>
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex justify-between items-center">
              <div><span className="text-slate-400 text-sm">Current Bowler</span><div className="text-2xl font-bold text-white">{bowlerName}</div></div>
              <div><span className="text-slate-400 text-sm">Figures</span><div className="text-xl font-mono text-[#B5E18B]">{bowlerDisplay}</div></div>
              <button onClick={() => setShowBowlerSelect(true)} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded">Change</button>
            </div>

            {/* Quick actions */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider">Quick Actions</h3>
                <button onClick={rotateStrike} className="text-xs text-blue-400 hover:text-blue-300 font-bold">⇄ Rotate Strike</button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[0,1,2,3,4,6].map(r => (
                  <button key={r} disabled={submitting || !strikerId || !bowlerId} onClick={() => recordBall({ runs: r })} className="h-16 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-2xl transition active:scale-95 disabled:opacity-30">{r}</button>
                ))}
                <button disabled={submitting || !strikerId || !bowlerId} onClick={() => recordBall({ runs: 0, extraType: 'wide', extraRuns: 1 })} className="h-16 rounded-xl bg-amber-900/30 hover:bg-amber-900/50 text-amber-400 font-bold">WD</button>
                <button disabled={submitting || !strikerId || !bowlerId} onClick={() => recordBall({ runs: 0, extraType: 'no ball', extraRuns: 1 })} className="h-16 rounded-xl bg-amber-900/30 hover:bg-amber-900/50 text-amber-400 font-bold">NB</button>
                <button disabled={submitting || !strikerId || !bowlerId} onClick={() => recordBall({ runs: 0, isWicket: true, wicketType: 'out' })} className="h-16 col-span-2 rounded-xl bg-red-900/30 hover:bg-red-900/50 text-red-400 font-black text-xl uppercase">Wicket</button>
                <button disabled={submitting || !strikerId || !bowlerId} onClick={() => recordBall({ runs: 0, extraType: 'bye', extraRuns: 1 })} className="h-16 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold">B</button>
                <button disabled={submitting || !strikerId || !bowlerId} onClick={() => recordBall({ runs: 0, extraType: 'leg bye', extraRuns: 1 })} className="h-16 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold">LB</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 flex flex-col items-center justify-center bg-slate-900/50 border border-dashed border-slate-700 rounded-2xl p-10">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold text-white mb-2">Innings Completed!</h3>
            <p className="text-slate-400 text-center max-w-md">
              {allInnings.length === 1 
                ? "The first innings has ended. Ready to start the chase?" 
                : "The match has concluded. Check the final scores below."}
            </p>
          </div>
        )}

        {/* Right: summary */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-3">Score Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Total</span><span className="text-white font-bold">{currentInnings.total_runs}/{currentInnings.total_wickets}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Extras</span><span className="text-white">{extras}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Partnership</span><span className="text-white">{partnership.runs} ({partnership.balls} balls)</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">CRR</span><span className="text-white">{(currentInnings.total_runs / Math.max(currentInnings.overs, 0.1)).toFixed(2)}</span></div>
            </div>
          </div>
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-3">Recent Balls</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {ballEvents.slice(-12).reverse().map(ball => (
                <div key={ball.id} className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${
                  ball.is_wicket ? 'bg-red-600 border-red-500' :
                  ball.runs === 4 ? 'bg-blue-600 border-blue-500' :
                  ball.runs === 6 ? 'bg-purple-600 border-purple-500' :
                  ball.extra_type ? 'bg-amber-600 border-amber-500' :
                  'bg-slate-700 border-slate-600'
                } text-white`}>
                  {ball.is_wicket ? 'W' : ball.extra_type ? ball.extra_type[0].toUpperCase() : ball.runs}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Full Scoreboard */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800"><h2 className="text-xl font-bold text-white flex items-center gap-2"><span className="text-[#B5E18B]">🏏</span> Batting: {battingTeamName}</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-slate-300"><tr><th className="p-3 text-left">Batter</th><th className="p-3 text-center">R</th><th className="p-3 text-center">B</th><th className="p-3 text-center">4s</th><th className="p-3 text-center">6s</th><th className="p-3 text-center">SR</th><th className="p-3 text-left"></th></tr></thead>
            <tbody>
              {battingRows.map((b, i) => (
                <tr key={i} className="border-t border-slate-800 hover:bg-slate-800/50">
                  <td className="p-3 font-medium text-white">{b.name}{b.out && <span className="text-red-400 ml-2 text-xs">(out)</span>}</td>
                  <td className="p-3 text-center text-white">{b.runs}</td><td className="p-3 text-center text-white">{b.balls}</td>
                  <td className="p-3 text-center text-blue-400">{b.fours}</td><td className="p-3 text-center text-purple-400">{b.sixes}</td>
                  <td className="p-3 text-center text-[#B5E18B]">{b.sr}</td>
                  <td className="p-3 text-left text-xs text-slate-500">{b.out ? (b.wicketType || "out") : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800"><h2 className="text-xl font-bold text-white flex items-center gap-2"><span className="text-[#B5E18B]">⚡</span> Bowling: {bowlingTeamName}</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-slate-300"><tr><th className="p-3 text-left">Bowler</th><th className="p-3 text-center">O</th><th className="p-3 text-center">M</th><th className="p-3 text-center">R</th><th className="p-3 text-center">W</th><th className="p-3 text-center">Econ</th></tr></thead>
            <tbody>
              {bowlingRows.map((b, i) => (
                <tr key={i} className="border-t border-slate-800 hover:bg-slate-800/50">
                  <td className="p-3 font-medium text-white">{b.name}</td>
                  <td className="p-3 text-center text-white">{b.overs}</td><td className="p-3 text-center text-white">{b.maidens}</td>
                  <td className="p-3 text-center text-white">{b.runs}</td><td className="p-3 text-center text-white">{b.wickets}</td>
                  <td className="p-3 text-center text-[#B5E18B]">{b.econ}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ball-by-Ball */}
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
        <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-4">Ball by Ball</h3>
        <div className="grid md:grid-cols-2 gap-5">
          {Array.from(oversMap.entries()).sort((a,b)=>a[0]-b[0]).map(([over, balls]) => (
            <div key={over} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="text-[#B5E18B] font-bold mb-2">Over {over}</div>
              <div className="space-y-1 text-sm">
                {balls.map((ball, idx) => {
                  let outcome = "";
                  if (ball.is_wicket) outcome = `⚡ ${ball.wicket_type || "Wicket"}`;
                  else if (ball.extra_type) outcome = `${ball.extra_type.toUpperCase()} ${ball.extra_runs > 0 ? `+${ball.extra_runs}` : ""}`;
                  else outcome = `${ball.runs} run${ball.runs !== 1 ? "s" : ""}`;
                  const bowler = players.find(p => p.id === ball.bowler_id)?.name;
                  return <div key={idx} className="flex justify-between items-center border-b border-slate-700/50 py-1"><span>{outcome}</span><span className="text-slate-400 text-xs">from {bowler}</span></div>;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showBowlerSelect && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale:0.9,opacity:0 }} animate={{ scale:1,opacity:1 }} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">Select Next Bowler</h2>
              <div className="grid gap-2 max-h-60 overflow-y-auto pr-2">
                {bowlingTeamPlayers.filter(p => p.id !== bowlerId).map(p => (
                  <button key={p.id} onClick={() => { setBowlerId(p.id); setShowBowlerSelect(false); }} className="w-full text-left p-4 rounded-xl bg-slate-800 hover:bg-blue-600 text-white transition font-medium">{p.name}</button>
                ))}
              </div>
              <button onClick={() => setShowBowlerSelect(false)} className="mt-4 w-full py-2 text-slate-500 hover:text-white transition">Cancel</button>
            </motion.div>
          </div>
        )}
        {showWicketSelect && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale:0.9,opacity:0 }} animate={{ scale:1,opacity:1 }} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">Select Incoming Batsman</h2>
              <div className="grid gap-2 max-h-60 overflow-y-auto pr-2">
                {battingTeamPlayers.filter(p => {
                  const alreadyPlaying = p.id === strikerId || p.id === nonStrikerId;
                  const isOut = ballEvents.some(b => b.batsman_id === p.id && b.is_wicket);
                  return !alreadyPlaying && !isOut;
                }).map(p => (
                  <button key={p.id} onClick={() => {
                    if (!strikerId) setStrikerId(p.id);
                    else if (!nonStrikerId) setNonStrikerId(p.id);
                    setShowWicketSelect(false);
                  }} className="w-full text-left p-4 rounded-xl bg-slate-800 hover:bg-blue-600 text-white transition font-medium">{p.name}</button>
                ))}
              </div>
              <button onClick={() => setShowWicketSelect(false)} className="mt-4 w-full py-2 text-slate-500 hover:text-white transition">Cancel</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}