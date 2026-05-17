"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer, AreaChart, Area
} from "recharts";

// ==================== TYPES ====================
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

interface Match {
  id: number;
  team_a_name: string;
  team_b_name: string;
  team_a_logo_url?: string;
  team_b_logo_url?: string;
  total_overs: number;
  status: string;
}

// ==================== HELPERS ====================
const isLegal = (b: BallEvent) => b.extra_type !== "wide" && b.extra_type !== "no ball";
const toOvers = (legalBalls: number) => `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;

// ==================== ANALYSIS PROCESSOR ====================
function computeInningsAnalysis(
  innings: Innings | null,
  balls: BallEvent[],
  players: Player[],
  totalOvers: number
) {
  if (!innings) return null;

  const sorted = [...balls].sort(
    (a, b) => a.over_number * 100 + a.ball_number - (b.over_number * 100 + b.ball_number)
  );

  let legalBalls = 0;
  const runsPerOver: { over: number; runs: number }[] = [];
  const wicketsPerOver: { over: number; wickets: number }[] = [];
  const partnershipProgression: { ballIndex: number; runs: number }[] = [];
  let currentPartnership = 0;
  let cumulativeRuns = 0;
  const fallOfWickets: { over: string; runs: number; wicket: number; batsman: string }[] = [];
  let wicketCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    const legal = isLegal(b);
    const runsThisBall = b.runs + (b.extra_runs || 0);
    cumulativeRuns += runsThisBall;

    if (legal) {
      const overNum = Math.floor(legalBalls / 6);
      legalBalls++;
      if (!runsPerOver[overNum]) runsPerOver[overNum] = { over: overNum + 1, runs: 0 };
      runsPerOver[overNum].runs += runsThisBall;
      if (b.is_wicket) {
        if (!wicketsPerOver[overNum]) wicketsPerOver[overNum] = { over: overNum + 1, wickets: 0 };
        wicketsPerOver[overNum].wickets++;
      }
    }

    // Partnership progression
    if (b.is_wicket && b.dismissed_batsman_id) {
      partnershipProgression.push({ ballIndex: i, runs: currentPartnership });
      currentPartnership = 0;
      wicketCount++;
      const overStr = toOvers(legalBalls);
      const batsmanName = players.find(p => p.id === b.dismissed_batsman_id)?.name ?? "Unknown";
      fallOfWickets.push({
        over: overStr,
        runs: cumulativeRuns,
        wicket: wicketCount,
        batsman: batsmanName,
      });
    } else {
      currentPartnership += runsThisBall;
      if (i === sorted.length - 1) {
        partnershipProgression.push({ ballIndex: i, runs: currentPartnership });
      }
    }
  }

  // Run rate progression (over by over)
  const currentRunRateProgression: { over: number; crr: number }[] = [];
  const oversCount = Math.ceil(legalBalls / 6);
  for (let ov = 1; ov <= oversCount; ov++) {
    const deliveriesUpToOver = Math.min(ov * 6, legalBalls);
    const runsUpToOver = runsPerOver.slice(0, ov).reduce((sum, o) => sum + (o?.runs || 0), 0);
    const crr = deliveriesUpToOver > 0 ? (runsUpToOver / (deliveriesUpToOver / 6)) : 0;
    currentRunRateProgression.push({ over: ov, crr: parseFloat(crr.toFixed(2)) });
  }

  const cleanRunsPerOver = runsPerOver.filter(r => r !== undefined);
  const cleanWicketsPerOver = wicketsPerOver.filter(w => w !== undefined);

  return {
    runsPerOver: cleanRunsPerOver,
    wicketsPerOver: cleanWicketsPerOver,
    partnershipProgression,
    runRateProgression: currentRunRateProgression,
    totalRuns: cumulativeRuns,
    totalWickets: innings.total_wickets,
    legalBalls,
    fallOfWickets,
  };
}

// ==================== MAIN CLIENT COMPONENT ====================
export default function MatchAnalysisClient() {
  const params = useParams();
  const idParam = params?.id as string | undefined;
  const matchId = idParam ? parseInt(idParam, 10) : NaN;

  if (isNaN(matchId)) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-red-400 font-bold">
        ❌ Invalid Match ID: {idParam || "undefined"}
      </div>
    );
  }

  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [allInnings, setAllInnings] = useState<Innings[]>([]);
  const [ballEventsMap, setBallEventsMap] = useState<Map<number, BallEvent[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "innings1" | "innings2" | "h2h">("overview");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/matches/${matchId}?full=true`);
        if (!res.ok) throw new Error(`Match API returned ${res.status}`);
        const data = await res.json();

        setMatch(data);
        setPlayers(data.players || []);
        setAllInnings(data.innings || []);

        const ballsMap = new Map<number, BallEvent[]>();
        const ballEvents = data.ballEvents || [];
        
        // Group balls by innings_id
        ballEvents.forEach((ball: BallEvent) => {
          if (!ballsMap.has(ball.innings_id)) {
            ballsMap.set(ball.innings_id, []);
          }
          ballsMap.get(ball.innings_id)!.push(ball);
        });

        setBallEventsMap(ballsMap);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load match analytics data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [matchId]);

  const getBalls = (inningsId: number | undefined) => (inningsId ? ballEventsMap.get(inningsId) || [] : []);

  const firstInnings = allInnings.find(i => i.innings_number === 1);
  const secondInnings = allInnings.find(i => i.innings_number === 2);
  const firstBalls = getBalls(firstInnings?.id);
  const secondBalls = getBalls(secondInnings?.id);

  const firstAnalysis = useMemo(
    () => computeInningsAnalysis(firstInnings || null, firstBalls, players, match?.total_overs || 20),
    [firstInnings, firstBalls, players, match?.total_overs]
  );
  const secondAnalysis = useMemo(
    () => computeInningsAnalysis(secondInnings || null, secondBalls, players, match?.total_overs || 20),
    [secondInnings, secondBalls, players, match?.total_overs]
  );

  // Compute Head-To-Head comparison data
  const h2hData = useMemo(() => {
    if (!firstAnalysis) return null;
    
    const getStats = (balls: BallEvent[], analysis: any) => {
      let fours = 0;
      let sixes = 0;
      let dots = 0;
      let extras = 0;

      balls.forEach(b => {
        if (b.runs === 4) fours++;
        if (b.runs === 6) sixes++;
        if (b.runs === 0 && !b.extra_type) dots++;
        extras += b.extra_runs || 0;
      });

      const totalBalls = balls.filter(isLegal).length;
      const dotPercentage = totalBalls > 0 ? ((dots / totalBalls) * 100).toFixed(1) : "0.0";
      const bestPartnership = analysis?.partnershipProgression?.length
        ? Math.max(...analysis.partnershipProgression.map((p: any) => p.runs), 0)
        : 0;

      return {
        runs: analysis?.totalRuns ?? 0,
        wickets: analysis?.totalWickets ?? 0,
        overs: toOvers(totalBalls),
        fours,
        sixes,
        boundaries: fours + sixes,
        dots,
        dotPercentage,
        extras,
        bestPartnership,
      };
    };

    return {
      teamA: getStats(firstBalls, firstAnalysis),
      teamB: getStats(secondBalls, secondAnalysis),
    };
  }, [firstAnalysis, secondAnalysis, firstBalls, secondBalls]);

  const getBattingStats = (balls: BallEvent[], teamPlayers: Player[]) => {
    const stats = new Map<number, { runs: number; balls: number; fours: number; sixes: number }>();
    for (const b of balls) {
      if (!b.batsman_id) continue;
      const s = stats.get(b.batsman_id) || { runs: 0, balls: 0, fours: 0, sixes: 0 };
      s.runs += b.runs;
      if (isLegal(b)) {
        s.balls++;
        if (b.runs === 4) s.fours++;
        if (b.runs === 6) s.sixes++;
      }
      stats.set(b.batsman_id, s);
    }
    return teamPlayers
      .map(p => {
        const s = stats.get(p.id) || { runs: 0, balls: 0, fours: 0, sixes: 0 };
        const sr = s.balls > 0 ? ((s.runs / s.balls) * 100).toFixed(1) : "0.0";
        return { id: p.id, name: p.name, ...s, sr };
      })
      .filter(b => b.runs > 0 || b.balls > 0)
      .sort((a, b) => b.runs - a.runs);
  };

  const getBowlingStats = (balls: BallEvent[], teamPlayers: Player[]) => {
    const stats = new Map<number, { runs: number; wickets: number; legal: number }>();
    for (const b of balls) {
      if (!b.bowler_id) continue;
      const s = stats.get(b.bowler_id) || { runs: 0, wickets: 0, legal: 0 };
      s.runs += b.runs + (b.extra_runs || 0);
      if (b.is_wicket) s.wickets++;
      if (isLegal(b)) s.legal++;
      stats.set(b.bowler_id, s);
    }
    return teamPlayers
      .map(p => {
        const s = stats.get(p.id) || { runs: 0, wickets: 0, legal: 0 };
        const overs = (s.legal / 6).toFixed(1);
        const econ = s.legal > 0 ? (s.runs / (s.legal / 6)).toFixed(2) : "0.00";
        return { id: p.id, name: p.name, runs: s.runs, wickets: s.wickets, overs, econ };
      })
      .filter(b => b.runs > 0 || b.wickets > 0)
      .sort((a, b) => b.wickets - a.wickets);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-[#B5E18B]/30 border-t-[#B5E18B] rounded-full animate-spin" />
        <span className="text-[#778da9] text-xs font-black uppercase tracking-widest">Parsing Match Intelligence...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center gap-4 px-4">
        <span className="text-5xl">⚠️</span>
        <h2 className="text-red-400 font-black text-xl uppercase tracking-wider">Analytical Engine Failure</h2>
        <p className="text-[#778da9] text-sm text-center max-w-md">{error}</p>
        <Link href={`/match/${matchId}`} className="px-5 py-2.5 bg-[#1b263b] rounded-xl text-white font-bold border border-white/5 hover:border-[#B5E18B]/30 transition-all text-decoration-none">
          Return to Scorecard
        </Link>
      </div>
    );
  }

  if (!match) return null;

  const teamAName = match.team_a_name;
  const teamBName = match.team_b_name;

  // Custom Neon Color Gradients for charts
  const ChartGradients = () => (
    <svg style={{ height: 0, width: 0, position: 'absolute' }}>
      <defs>
        <linearGradient id="runsGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#B5E18B" stopOpacity={0.8}/>
          <stop offset="95%" stopColor="#B5E18B" stopOpacity={0.1}/>
        </linearGradient>
        <linearGradient id="wicketsGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
        </linearGradient>
        <linearGradient id="partGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
        </linearGradient>
        <linearGradient id="runRateGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#e9c46a" stopOpacity={0.3}/>
          <stop offset="95%" stopColor="#e9c46a" stopOpacity={0}/>
        </linearGradient>
      </defs>
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e0e1dd] py-8 px-4 sm:px-6 relative overflow-hidden font-sans">
      <ChartGradients />
      
      {/* Background radial effects */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-[#28396C]/10 to-transparent pointer-events-none" />
      <div className="absolute top-20 right-10 w-96 h-96 bg-[#B5E18B]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#778da9]/10 pb-6">
          <div className="flex items-center gap-3">
            <Link href={`/match/${matchId}`} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#1b263b] border border-white/5 hover:border-[#B5E18B]/30 hover:bg-[#B5E18B]/10 text-white transition-all text-decoration-none">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <span className="text-[9px] font-black tracking-[0.4em] text-[#778da9] uppercase">Match Analytical Suite</span>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-white leading-none mt-1">In-Depth Insights</h1>
            </div>
          </div>
          
          {/* Match Info Panel */}
          <div className="flex items-center gap-4 bg-[#1b263b]/50 border border-[#778da9]/10 rounded-2xl p-4 glass-dark">
            <div className="text-right">
              <div className="text-xs font-bold text-white uppercase">{teamAName}</div>
              <div className="text-[10px] text-[#778da9]">1st Innings</div>
            </div>
            <div className="text-center bg-[#B5E18B]/10 px-3 py-1.5 rounded-lg border border-[#B5E18B]/20 text-xs font-black text-[#B5E18B]">
              {firstAnalysis?.totalRuns ?? 0}/{firstAnalysis?.totalWickets ?? 0}
            </div>
            <span className="text-xs font-black text-[#778da9]">VS</span>
            <div className="text-left">
              <div className="text-xs font-bold text-white uppercase">{teamBName}</div>
              <div className="text-[10px] text-[#778da9]">{secondInnings ? "2nd Innings" : "Yet to bat"}</div>
            </div>
            {secondInnings && (
              <div className="text-center bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 text-xs font-black text-blue-400">
                {secondAnalysis?.totalRuns ?? 0}/{secondAnalysis?.totalWickets ?? 0}
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-[#0d1b2a] border border-[#778da9]/10 rounded-xl overflow-x-auto custom-scrollbar select-none">
          {[
            { id: "overview", label: "📈 Match Progression", icon: "📊" },
            { id: "innings1", label: `${teamAName} Innings`, icon: "Ⅰ" },
            { id: "innings2", label: `${teamBName} Innings`, icon: "Ⅱ" },
            { id: "h2h", label: "⚔️ Head-to-Head Stats", icon: "⚡" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#B5E18B] border-[#B5E18B] text-[#0d1b2a] shadow-lg shadow-[#B5E18B]/10"
                  : "bg-transparent border-transparent text-[#778da9] hover:text-white hover:bg-[#1b263b]/30"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tabs Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            
            {/* ==================== TAB 1: MATCH PROGRESSION ==================== */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                
                {/* Score progression comparison chart */}
                <div className="bg-[#1b263b]/30 border border-[#778da9]/10 rounded-2xl p-6 glass-dark">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-lg font-black uppercase tracking-tight text-white">Run Rate Progression</h2>
                      <p className="text-[#778da9] text-xs">Comparative analysis of current and target run rate per over</p>
                    </div>
                  </div>
                  
                  <div className="h-[300px]">
                    {firstAnalysis && firstAnalysis.runRateProgression.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={
                          Array.from({ length: Math.max(firstAnalysis.runRateProgression.length, secondAnalysis?.runRateProgression.length || 0) }).map((_, idx) => {
                            const over = idx + 1;
                            const t1 = firstAnalysis.runRateProgression[idx]?.crr || null;
                            const t2 = secondAnalysis?.runRateProgression[idx]?.crr || null;
                            return { over, [teamAName]: t1, [teamBName]: t2 };
                          })
                        }>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(119, 141, 169, 0.08)" />
                          <XAxis dataKey="over" stroke="#778da9" tick={{ fontSize: 10, fill: "#778da9" }} label={{ value: "OVERS", position: "insideBottom", offset: -5, fill: "#778da9", fontSize: 10, fontWeight: 900 }} />
                          <YAxis stroke="#778da9" tick={{ fontSize: 10, fill: "#778da9" }} label={{ value: "RUN RATE (RPO)", angle: -90, position: "insideLeft", fill: "#778da9", fontSize: 10, fontWeight: 900 }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0d1b2a", borderColor: "rgba(119, 141, 169, 0.15)", borderRadius: '8px' }} />
                          <Legend />
                          <Line type="monotone" dataKey={teamAName} stroke="#B5E18B" strokeWidth={3} dot={{ stroke: '#B5E18B', strokeWidth: 1, r: 3 }} activeDot={{ r: 5 }} />
                          {secondInnings && <Line type="monotone" dataKey={teamBName} stroke="#3b82f6" strokeWidth={3} dot={{ stroke: '#3b82f6', strokeWidth: 1, r: 3 }} activeDot={{ r: 5 }} />}
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-[#778da9] text-center py-20 text-xs uppercase tracking-widest">Innings 1 has not started yet.</p>
                    )}
                  </div>
                </div>

                {/* Over by over scoring bars side-by-side */}
                <div className="bg-[#1b263b]/30 border border-[#778da9]/10 rounded-2xl p-6 glass-dark">
                  <div className="mb-6">
                    <h2 className="text-lg font-black uppercase tracking-tight text-white">Over-by-Over Score Comparison</h2>
                    <p className="text-[#778da9] text-xs">Runs scored in each individual over by both teams</p>
                  </div>
                  
                  <div className="h-[300px]">
                    {firstAnalysis && firstAnalysis.runsPerOver.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={
                          Array.from({ length: Math.max(firstAnalysis.runsPerOver.length, secondAnalysis?.runsPerOver.length || 0) }).map((_, idx) => {
                            const over = idx + 1;
                            const r1 = firstAnalysis.runsPerOver[idx]?.runs || 0;
                            const r2 = secondAnalysis?.runsPerOver[idx]?.runs || 0;
                            return { over, [teamAName]: r1, [teamBName]: r2 };
                          })
                        }>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(119, 141, 169, 0.08)" />
                          <XAxis dataKey="over" stroke="#778da9" tick={{ fontSize: 10, fill: "#778da9" }} />
                          <YAxis stroke="#778da9" tick={{ fontSize: 10, fill: "#778da9" }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0d1b2a", borderColor: "rgba(119, 141, 169, 0.15)", borderRadius: '8px' }} />
                          <Legend />
                          <Bar dataKey={teamAName} fill="#B5E18B" radius={[4, 4, 0, 0]} />
                          {secondInnings && <Bar dataKey={teamBName} fill="#3b82f6" radius={[4, 4, 0, 0]} />}
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-[#778da9] text-center py-20 text-xs uppercase tracking-widest">No runs recorded yet.</p>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* ==================== TAB 2: INNINGS 1 DETAIL ==================== */}
            {activeTab === "innings1" && (
              <div className="space-y-8">
                {firstInnings && firstAnalysis ? (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Runs per Over */}
                      <div className="bg-[#1b263b]/30 border border-[#778da9]/10 rounded-2xl p-5 glass-dark">
                        <h3 className="text-xs font-black text-[#B5E18B] uppercase tracking-widest mb-4">📈 Individual Overs</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={firstAnalysis.runsPerOver}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(119, 141, 169, 0.06)" />
                            <XAxis dataKey="over" stroke="#778da9" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#778da9" tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: "#0d1b2a", borderColor: "rgba(119, 141, 169, 0.1)" }} />
                            <Bar dataKey="runs" fill="url(#runsGrad)" stroke="#B5E18B" strokeWidth={1.5} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Wickets per over */}
                      <div className="bg-[#1b263b]/30 border border-[#778da9]/10 rounded-2xl p-5 glass-dark">
                        <h3 className="text-xs font-black text-red-400 uppercase tracking-widest mb-4">🛑 Wickets Fall per Over</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={firstAnalysis.wicketsPerOver}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(119, 141, 169, 0.06)" />
                            <XAxis dataKey="over" stroke="#778da9" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#778da9" tick={{ fontSize: 10 }} allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: "#0d1b2a", borderColor: "rgba(119, 141, 169, 0.1)" }} />
                            <Bar dataKey="wickets" fill="url(#wicketsGrad)" stroke="#ef4444" strokeWidth={1.5} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Partnership Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-[#1b263b]/30 border border-[#778da9]/10 rounded-2xl p-5 glass-dark">
                        <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">🤝 Partnership Runs</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <AreaChart data={firstAnalysis.partnershipProgression.map((p, idx) => ({ idx: idx + 1, runs: p.runs }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(119, 141, 169, 0.06)" />
                            <XAxis dataKey="idx" stroke="#778da9" />
                            <YAxis stroke="#778da9" />
                            <Tooltip contentStyle={{ backgroundColor: "#0d1b2a", borderColor: "rgba(119, 141, 169, 0.1)" }} />
                            <Area type="monotone" dataKey="runs" fill="url(#partGrad)" stroke="#3b82f6" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Fall of Wickets list */}
                      <div className="bg-[#1b263b]/30 border border-[#778da9]/10 rounded-2xl p-5 glass-dark flex flex-col justify-between">
                        <h3 className="text-xs font-black text-[#778da9] uppercase tracking-widest mb-4">📉 Fall of Wickets Timeline</h3>
                        <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-2">
                          {firstAnalysis.fallOfWickets.length > 0 ? (
                            firstAnalysis.fallOfWickets.map((w, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-[#0d1b2a]/60 border border-[#778da9]/5 rounded-xl px-4 py-2.5 hover:border-[#B5E18B]/20 transition-all">
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-xs font-black text-red-400">
                                    {w.wicket}
                                  </span>
                                  <div>
                                    <div className="text-xs font-bold text-white">{w.batsman}</div>
                                    <div className="text-[9px] text-[#778da9] uppercase tracking-wider">Score: {w.runs} runs</div>
                                  </div>
                                </div>
                                <span className="text-xs font-black text-[#B5E18B]">Over {w.over}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[#778da9] text-xs uppercase tracking-wider py-12 text-center">No wickets recorded</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Batsman & Bowlers Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-xs font-black text-[#B5E18B] uppercase tracking-widest mb-3">🏏 Batting Highlights</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {getBattingStats(firstBalls, players.filter(p => p.team === firstInnings.batting_team)).map(b => (
                            <div key={b.id} className="bg-[#1b263b]/30 p-4 rounded-2xl border border-[#778da9]/10 hover:border-[#B5E18B]/30 transition-all glass-dark">
                              <div className="font-bold text-white text-sm">{b.name}</div>
                              <div className="text-xs text-[#778da9] mt-0.5">{b.runs} runs off {b.balls} balls</div>
                              <div className="flex justify-between text-[9px] font-black text-[#B5E18B] uppercase mt-3 pt-2.5 border-t border-[#778da9]/5">
                                <span>4s: {b.fours}</span>
                                <span>6s: {b.sixes}</span>
                                <span className="text-white font-mono">SR: {b.sr}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">⚡ Bowling Intelligence</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {getBowlingStats(firstBalls, players.filter(p => p.team === firstInnings.bowling_team)).map(b => (
                            <div key={b.id} className="bg-[#1b263b]/30 p-4 rounded-2xl border border-[#778da9]/10 hover:border-blue-500/30 transition-all glass-dark">
                              <div className="font-bold text-white text-sm">{b.name}</div>
                              <div className="text-xs text-[#778da9] mt-0.5">{b.wickets} wickets conceded {b.runs} runs</div>
                              <div className="flex justify-between text-[9px] font-black text-blue-400 uppercase mt-3 pt-2.5 border-t border-[#778da9]/5">
                                <span>Overs: {b.overs}</span>
                                <span className="text-white font-mono">Econ: {b.econ}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-[#778da9] text-center py-20 text-xs uppercase tracking-widest">First innings has not played yet.</p>
                )}
              </div>
            )}

            {/* ==================== TAB 3: INNINGS 2 DETAIL ==================== */}
            {activeTab === "innings2" && (
              <div className="space-y-8">
                {secondInnings && secondAnalysis ? (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Runs per Over */}
                      <div className="bg-[#1b263b]/30 border border-[#778da9]/10 rounded-2xl p-5 glass-dark">
                        <h3 className="text-xs font-black text-[#B5E18B] uppercase tracking-widest mb-4">📈 Individual Overs</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={secondAnalysis.runsPerOver}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(119, 141, 169, 0.06)" />
                            <XAxis dataKey="over" stroke="#778da9" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#778da9" tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: "#0d1b2a", borderColor: "rgba(119, 141, 169, 0.1)" }} />
                            <Bar dataKey="runs" fill="url(#runsGrad)" stroke="#B5E18B" strokeWidth={1.5} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Wickets per over */}
                      <div className="bg-[#1b263b]/30 border border-[#778da9]/10 rounded-2xl p-5 glass-dark">
                        <h3 className="text-xs font-black text-red-400 uppercase tracking-widest mb-4">🛑 Wickets Fall per Over</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={secondAnalysis.wicketsPerOver}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(119, 141, 169, 0.06)" />
                            <XAxis dataKey="over" stroke="#778da9" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#778da9" tick={{ fontSize: 10 }} allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: "#0d1b2a", borderColor: "rgba(119, 141, 169, 0.1)" }} />
                            <Bar dataKey="wickets" fill="url(#wicketsGrad)" stroke="#ef4444" strokeWidth={1.5} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Partnership Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-[#1b263b]/30 border border-[#778da9]/10 rounded-2xl p-5 glass-dark">
                        <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">🤝 Partnership Runs</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <AreaChart data={secondAnalysis.partnershipProgression.map((p, idx) => ({ idx: idx + 1, runs: p.runs }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(119, 141, 169, 0.06)" />
                            <XAxis dataKey="idx" stroke="#778da9" />
                            <YAxis stroke="#778da9" />
                            <Tooltip contentStyle={{ backgroundColor: "#0d1b2a", borderColor: "rgba(119, 141, 169, 0.1)" }} />
                            <Area type="monotone" dataKey="runs" fill="url(#partGrad)" stroke="#3b82f6" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Fall of Wickets list */}
                      <div className="bg-[#1b263b]/30 border border-[#778da9]/10 rounded-2xl p-5 glass-dark flex flex-col justify-between">
                        <h3 className="text-xs font-black text-[#778da9] uppercase tracking-widest mb-4">📉 Fall of Wickets Timeline</h3>
                        <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-2">
                          {secondAnalysis.fallOfWickets.length > 0 ? (
                            secondAnalysis.fallOfWickets.map((w, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-[#0d1b2a]/60 border border-[#778da9]/5 rounded-xl px-4 py-2.5 hover:border-[#B5E18B]/20 transition-all">
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-xs font-black text-red-400">
                                    {w.wicket}
                                  </span>
                                  <div>
                                    <div className="text-xs font-bold text-white">{w.batsman}</div>
                                    <div className="text-[9px] text-[#778da9] uppercase tracking-wider">Score: {w.runs} runs</div>
                                  </div>
                                </div>
                                <span className="text-xs font-black text-[#B5E18B]">Over {w.over}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[#778da9] text-xs uppercase tracking-wider py-12 text-center">No wickets recorded</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Batsman & Bowlers Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-xs font-black text-[#B5E18B] uppercase tracking-widest mb-3">🏏 Batting Highlights</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {getBattingStats(secondBalls, players.filter(p => p.team === secondInnings.batting_team)).map(b => (
                            <div key={b.id} className="bg-[#1b263b]/30 p-4 rounded-2xl border border-[#778da9]/10 hover:border-[#B5E18B]/30 transition-all glass-dark">
                              <div className="font-bold text-white text-sm">{b.name}</div>
                              <div className="text-xs text-[#778da9] mt-0.5">{b.runs} runs off {b.balls} balls</div>
                              <div className="flex justify-between text-[9px] font-black text-[#B5E18B] uppercase mt-3 pt-2.5 border-t border-[#778da9]/5">
                                <span>4s: {b.fours}</span>
                                <span>6s: {b.sixes}</span>
                                <span className="text-white font-mono">SR: {b.sr}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">⚡ Bowling Intelligence</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {getBowlingStats(secondBalls, players.filter(p => p.team === secondInnings.bowling_team)).map(b => (
                            <div key={b.id} className="bg-[#1b263b]/30 p-4 rounded-2xl border border-[#778da9]/10 hover:border-blue-500/30 transition-all glass-dark">
                              <div className="font-bold text-white text-sm">{b.name}</div>
                              <div className="text-xs text-[#778da9] mt-0.5">{b.wickets} wickets conceded {b.runs} runs</div>
                              <div className="flex justify-between text-[9px] font-black text-blue-400 uppercase mt-3 pt-2.5 border-t border-[#778da9]/5">
                                <span>Overs: {b.overs}</span>
                                <span className="text-white font-mono">Econ: {b.econ}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-[#778da9] text-center py-20 text-xs uppercase tracking-widest">Second innings has not played yet.</p>
                )}
              </div>
            )}

            {/* ==================== TAB 4: HEAD-TO-HEAD COMPARISON ==================== */}
            {activeTab === "h2h" && (
              <div className="space-y-6">
                {h2hData ? (
                  <div className="bg-[#1b263b]/30 border border-[#778da9]/10 rounded-2xl p-6 glass-dark font-sans">
                    <h2 className="text-lg font-black uppercase tracking-tight text-white mb-6 text-center">Statistical Combat Matrix</h2>
                    
                    <div className="space-y-5">
                      {[
                        { label: "Total Score", key: "runs", format: (v: any, row: any) => `${v}/${row.wickets} (${row.overs} ov)` },
                        { label: "Total Boundaries", key: "boundaries", format: (v: any, row: any) => `${v} (4s: ${row.fours} | 6s: ${row.sixes})` },
                        { label: "Dot Ball Percentage", key: "dotPercentage", suffix: "%" },
                        { label: "Best Partnership", key: "bestPartnership", suffix: " runs" },
                        { label: "Extra Runs Conceded", key: "extras" },
                      ].map((metric, idx) => {
                        const valA = h2hData.teamA[metric.key as keyof typeof h2hData.teamA];
                        const valB = h2hData.teamB ? h2hData.teamB[metric.key as keyof typeof h2hData.teamB] : "—";
                        
                        const displayA = metric.format ? metric.format(valA, h2hData.teamA) : `${valA}${metric.suffix || ""}`;
                        const displayB = metric.format && h2hData.teamB ? metric.format(valB, h2hData.teamB) : h2hData.teamB ? `${valB}${metric.suffix || ""}` : "—";

                        const numA = typeof valA === "number" ? valA : parseFloat(String(valA)) || 0;
                        const numB = typeof valB === "number" ? valB : parseFloat(String(valB)) || 0;
                        const total = numA + numB || 1;
                        const pctA = (numA / total) * 100;
                        const pctB = (numB / total) * 100;

                        return (
                          <div key={idx} className="border-b border-[#778da9]/5 pb-4 last:border-b-0">
                            <div className="text-center text-[10px] font-black uppercase tracking-widest text-[#778da9] mb-2">
                              {metric.label}
                            </div>
                            <div className="flex justify-between items-center font-mono">
                              {/* Team A */}
                              <div className="flex-1 text-right pr-6">
                                <span className="text-sm font-black text-[#B5E18B]">{displayA}</span>
                              </div>
                              
                              {/* VS badge */}
                              <div className="px-3 py-1 bg-[#0d1b2a] border border-[#778da9]/10 rounded text-[9px] font-black text-[#778da9]">
                                VS
                              </div>
                              
                              {/* Team B */}
                              <div className="flex-1 text-left pl-6">
                                <span className="text-sm font-black text-blue-400">{displayB}</span>
                              </div>
                            </div>
                            {/* Premium Visual Combat Progress Bar */}
                            {h2hData.teamB && (
                              <div className="w-full h-1.5 bg-[#0d1b2a] rounded-full overflow-hidden flex mt-2.5 max-w-md mx-auto border border-white/[0.03]">
                                <div style={{ width: `${pctA}%` }} className="h-full bg-[#B5E18B] shadow-[0_0_8px_#B5E18B]" />
                                <div style={{ width: `${pctB}%` }} className="h-full bg-[#3b82f6] shadow-[0_0_8px_#3b82f6]" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[#778da9] text-center py-20 text-xs uppercase tracking-widest">Head-to-head stats will load once Innings 1 data is populated.</p>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}