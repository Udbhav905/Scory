"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer
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
      if (!runsPerOver[overNum]) runsPerOver[overNum] = { over: overNum, runs: 0 };
      runsPerOver[overNum].runs += runsThisBall;
      if (b.is_wicket) {
        if (!wicketsPerOver[overNum]) wicketsPerOver[overNum] = { over: overNum, wickets: 0 };
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

// ==================== UI COMPONENTS ====================
function RunsPerOverChart({ data }: { data: { over: number; runs: number }[] }) {
  if (data.length === 0) return <p className="text-[#a8dadc]/50 text-center py-8">No data available</p>;
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d3e5f" />
        <XAxis dataKey="over" label={{ value: "Over", position: "insideBottom", offset: -5, fill: "#a8dadc" }} />
        <YAxis label={{ value: "Runs", angle: -90, position: "insideLeft", fill: "#a8dadc" }} />
        <Tooltip contentStyle={{ backgroundColor: "#1d3557", borderColor: "#457b9d" }} />
        <Legend />
        <Bar dataKey="runs" fill="#e63946" name="Runs" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function WicketsPerOverChart({ data }: { data: { over: number; wickets: number }[] }) {
  if (data.length === 0) return <p className="text-[#a8dadc]/50 text-center py-8">No wickets recorded</p>;
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d3e5f" />
        <XAxis dataKey="over" label={{ value: "Over", position: "insideBottom", offset: -5, fill: "#a8dadc" }} />
        <YAxis label={{ value: "Wickets", angle: -90, position: "insideLeft", fill: "#a8dadc" }} />
        <Tooltip contentStyle={{ backgroundColor: "#1d3557", borderColor: "#457b9d" }} />
        <Legend />
        <Bar dataKey="wickets" fill="#f4a261" name="Wickets" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PartnershipChart({ data }: { data: { ballIndex: number; runs: number }[] }) {
  if (data.length === 0) return <p className="text-[#a8dadc]/50 text-center py-8">No partnerships formed</p>;
  const formatted = data.map((p, idx) => ({ partnership: idx + 1, runs: p.runs }));
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d3e5f" />
        <XAxis dataKey="partnership" label={{ value: "Partnership #", position: "insideBottom", offset: -5, fill: "#a8dadc" }} />
        <YAxis label={{ value: "Runs", angle: -90, position: "insideLeft", fill: "#a8dadc" }} />
        <Tooltip contentStyle={{ backgroundColor: "#1d3557", borderColor: "#457b9d" }} />
        <Legend />
        <Bar dataKey="runs" fill="#2a9d8f" name="Partnership Runs" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function RunRateProgressionChart({
  data,
  targetRunRate,
}: {
  data: { over: number; crr: number }[];
  targetRunRate?: number[];
}) {
  if (data.length === 0) return <p className="text-[#a8dadc]/50 text-center py-8">No run rate data</p>;
  const chartData = data.map((d, idx) => ({
    over: d.over,
    crr: d.crr,
    rrr: targetRunRate ? targetRunRate[idx] : null,
  }));
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d3e5f" />
        <XAxis dataKey="over" label={{ value: "Over", position: "insideBottom", offset: -5, fill: "#a8dadc" }} />
        <YAxis label={{ value: "Run Rate", angle: -90, position: "insideLeft", fill: "#a8dadc" }} />
        <Tooltip contentStyle={{ backgroundColor: "#1d3557", borderColor: "#457b9d" }} />
        <Legend />
        <Line type="monotone" dataKey="crr" stroke="#e9c46a" name="Current RR" strokeWidth={2} dot={false} />
        {targetRunRate && <Line type="monotone" dataKey="rrr" stroke="#e63946" name="Required RR" strokeWidth={2} strokeDasharray="5 5" dot={false} />}
      </LineChart>
    </ResponsiveContainer>
  );
}

function BatsmanCards({ batsmen }: { batsmen: any[] }) {
  if (batsmen.length === 0) return <p className="text-[#a8dadc]/40 text-sm">No batting stats</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {batsmen.map(b => (
        <div key={b.id} className="bg-[#1d3557]/60 p-3 rounded-xl border border-[#457b9d]/20 hover:border-[#e63946]/30 transition-all">
          <div className="font-bold text-white">{b.name}</div>
          <div className="text-sm text-[#a8dadc]">{b.runs} runs · {b.balls} balls</div>
          <div className="text-xs text-[#e63946] font-mono mt-1">
            4s: {b.fours} | 6s: {b.sixes} | SR: {b.sr}
          </div>
        </div>
      ))}
    </div>
  );
}

function BowlerCards({ bowlers }: { bowlers: any[] }) {
  if (bowlers.length === 0) return <p className="text-[#a8dadc]/40 text-sm">No bowling stats</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {bowlers.map(b => (
        <div key={b.id} className="bg-[#1d3557]/60 p-3 rounded-xl border border-[#457b9d]/20 hover:border-[#e63946]/30 transition-all">
          <div className="font-bold text-white">{b.name}</div>
          <div className="text-sm text-[#a8dadc]">{b.wickets} wickets · {b.runs} runs</div>
          <div className="text-xs text-[#e63946] font-mono mt-1">
            Econ: {b.econ} | Overs: {b.overs}
          </div>
        </div>
      ))}
    </div>
  );
}

function FallOfWickets({ wickets }: { wickets: { over: string; runs: number; wicket: number; batsman: string }[] }) {
  if (wickets.length === 0) return <p className="text-[#a8dadc]/40 text-sm">No wickets fallen</p>;
  return (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      {wickets.map((w, i) => (
        <div key={i} className="flex justify-between text-xs text-[#a8dadc] border-b border-[#457b9d]/20 py-1">
          <span>
            {w.wicket}-{w.runs} ({w.batsman})
          </span>
          <span>Over {w.over}</span>
        </div>
      ))}
    </div>
  );
}

// ==================== MAIN CLIENT COMPONENT ====================
export default function MatchAnalysisClient() {
  // ✅ Get the match ID from the URL
  const params = useParams();
  const idParam = params?.id as string | undefined;
  const matchId = idParam ? parseInt(idParam, 10) : NaN;

  // Show error if ID is invalid
  if (isNaN(matchId)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Invalid match ID: {idParam || "undefined"}
      </div>
    );
  }

  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [allInnings, setAllInnings] = useState<Innings[]>([]);
  const [ballEventsMap, setBallEventsMap] = useState<Map<number, BallEvent[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const matchRes = await fetch(`/api/matches/${matchId}`);
        if (!matchRes.ok) throw new Error(`Match API returned ${matchRes.status}`);
        const matchData = await matchRes.json();
        setMatch(matchData);

        const playersRes = await fetch(`/api/players?matchId=${matchId}`);
        if (!playersRes.ok) throw new Error(`Players API returned ${playersRes.status}`);
        const playersData = await playersRes.json();
        setPlayers(playersData);

        const inningsRes = await fetch(`/api/innings?matchId=${matchId}`);
        if (!inningsRes.ok) throw new Error(`Innings API returned ${inningsRes.status}`);
        const inningsData = await inningsRes.json();
        setAllInnings(inningsData);

        const ballsMap = new Map<number, BallEvent[]>();
        for (const inn of inningsData) {
          const ballsRes = await fetch(`/api/score?inningsId=${inn.id}`);
          if (ballsRes.ok) {
            const balls = await ballsRes.json();
            ballsMap.set(inn.id, balls);
          } else {
            console.warn(`Could not fetch balls for innings ${inn.id}`);
            ballsMap.set(inn.id, []);
          }
        }
        setBallEventsMap(ballsMap);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load match data");
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

  const target = firstAnalysis?.totalRuns ?? 0;
  const requiredRunRateOverByOver =
    secondAnalysis && secondAnalysis.runRateProgression
      ? secondAnalysis.runRateProgression.map((_, idx) => {
          const runsNeeded = target + 1 - (secondAnalysis.totalRuns * (idx + 1) / Math.max(secondAnalysis.legalBalls, 1) || 0);
          const oversLeft = (secondAnalysis.legalBalls / 6) - (idx + 1);
          return oversLeft > 0 ? runsNeeded / oversLeft : 0;
        })
      : null;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading analysis...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  if (!match) return <div className="min-h-screen flex items-center justify-center text-white">Match not found</div>;

  const teamAName = match.team_a_name;
  const teamBName = match.team_b_name;

  return (
    <div className="min-h-screen bg-[#0a0c12] text-[#e8eaf0] py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-12">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-center">Match Analysis</h1>

        {firstInnings && firstAnalysis && (
          <section className="space-y-8">
            <div className="flex items-center gap-3 border-b border-[#e63946]/30 pb-2">
              <div className="w-2 h-2 bg-[#e63946] rounded-full" />
              <h2 className="text-xl font-black uppercase tracking-widest">
                Innings 1 – {firstInnings.batting_team === "team_a" ? teamAName : teamBName}
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#1d3557]/40 rounded-2xl p-5 border border-[#457b9d]/30">
                <h3 className="text-sm font-black text-[#e63946] uppercase tracking-widest mb-4">Runs per Over</h3>
                <RunsPerOverChart data={firstAnalysis.runsPerOver} />
              </div>
              <div className="bg-[#1d3557]/40 rounded-2xl p-5 border border-[#457b9d]/30">
                <h3 className="text-sm font-black text-[#e63946] uppercase tracking-widest mb-4">Wickets per Over</h3>
                <WicketsPerOverChart data={firstAnalysis.wicketsPerOver} />
              </div>
              <div className="bg-[#1d3557]/40 rounded-2xl p-5 border border-[#457b9d]/30">
                <h3 className="text-sm font-black text-[#e63946] uppercase tracking-widest mb-4">Run Rate Progression</h3>
                <RunRateProgressionChart data={firstAnalysis.runRateProgression} />
              </div>
              <div className="bg-[#1d3557]/40 rounded-2xl p-5 border border-[#457b9d]/30">
                <h3 className="text-sm font-black text-[#e63946] uppercase tracking-widest mb-4">Partnerships</h3>
                <PartnershipChart data={firstAnalysis.partnershipProgression} />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-black text-[#e63946] uppercase tracking-widest mb-3">Top Batsmen</h3>
                <BatsmanCards batsmen={getBattingStats(firstBalls, players.filter(p => p.team === firstInnings.batting_team))} />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#e63946] uppercase tracking-widest mb-3">Top Bowlers</h3>
                <BowlerCards bowlers={getBowlingStats(firstBalls, players.filter(p => p.team === firstInnings.bowling_team))} />
              </div>
            </div>
            <div className="bg-[#1d3557]/30 rounded-xl p-5">
              <h3 className="text-sm font-black text-[#e63946] uppercase tracking-widest mb-3">Fall of Wickets</h3>
              <FallOfWickets wickets={firstAnalysis.fallOfWickets} />
            </div>
          </section>
        )}

        {secondInnings && secondAnalysis && (
          <section className="space-y-8">
            <div className="flex items-center gap-3 border-b border-[#e63946]/30 pb-2">
              <div className="w-2 h-2 bg-[#e63946] rounded-full" />
              <h2 className="text-xl font-black uppercase tracking-widest">
                Innings 2 – {secondInnings.batting_team === "team_a" ? teamAName : teamBName}
              </h2>
              <div className="ml-auto text-sm bg-[#e63946]/20 px-3 py-1 rounded-full">Target: {target + 1}</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#1d3557]/40 rounded-2xl p-5 border border-[#457b9d]/30">
                <h3 className="text-sm font-black text-[#e63946] uppercase tracking-widest mb-4">Runs per Over</h3>
                <RunsPerOverChart data={secondAnalysis.runsPerOver} />
              </div>
              <div className="bg-[#1d3557]/40 rounded-2xl p-5 border border-[#457b9d]/30">
                <h3 className="text-sm font-black text-[#e63946] uppercase tracking-widest mb-4">Wickets per Over</h3>
                <WicketsPerOverChart data={secondAnalysis.wicketsPerOver} />
              </div>
              <div className="bg-[#1d3557]/40 rounded-2xl p-5 border border-[#457b9d]/30">
                <h3 className="text-sm font-black text-[#e63946] uppercase tracking-widest mb-4">Run Rate Progression</h3>
                <RunRateProgressionChart data={secondAnalysis.runRateProgression} targetRunRate={requiredRunRateOverByOver ?? undefined} />
              </div>
              <div className="bg-[#1d3557]/40 rounded-2xl p-5 border border-[#457b9d]/30">
                <h3 className="text-sm font-black text-[#e63946] uppercase tracking-widest mb-4">Partnerships</h3>
                <PartnershipChart data={secondAnalysis.partnershipProgression} />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-black text-[#e63946] uppercase tracking-widest mb-3">Top Batsmen</h3>
                <BatsmanCards batsmen={getBattingStats(secondBalls, players.filter(p => p.team === secondInnings.batting_team))} />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#e63946] uppercase tracking-widest mb-3">Top Bowlers</h3>
                <BowlerCards bowlers={getBowlingStats(secondBalls, players.filter(p => p.team === secondInnings.bowling_team))} />
              </div>
            </div>
            <div className="bg-[#1d3557]/30 rounded-xl p-5">
              <h3 className="text-sm font-black text-[#e63946] uppercase tracking-widest mb-3">Fall of Wickets</h3>
              <FallOfWickets wickets={secondAnalysis.fallOfWickets} />
            </div>
          </section>
        )}

        {!firstInnings && !secondInnings && (
          <div className="text-center text-[#a8dadc]/50 py-12">No innings data available</div>
        )}
      </div>
    </div>
  );
}