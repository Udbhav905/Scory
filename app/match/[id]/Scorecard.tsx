"use client";

import { useEffect, useState } from "react";

interface Innings {
  id: number;
  innings_number: number;
  batting_team: string;
  bowling_team: string;
  total_runs: number;
  total_wickets: number;
  overs: number;
  is_completed: boolean;
}

export default function Scorecard({ matchId }: { matchId: number }) {
  const [inningsList, setInningsList] = useState<Innings[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [currentInnings, setCurrentInnings] = useState<Innings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStartInnings, setShowStartInnings] = useState(false);
  const [battingTeam, setBattingTeam] = useState("");
  const [bowlingTeam, setBowlingTeam] = useState("");
  const [ballForm, setBallForm] = useState({
    over_number: 0,
    ball_number: 0,
    batsman_id: "",
    bowler_id: "",
    runs: 0,
    is_wicket: false,
    wicket_type: "",
    extra_type: "",
    extra_runs: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, [matchId]);

  const fetchData = async () => {
    const inningsRes = await fetch(`/api/innings?matchId=${matchId}`);
    if (inningsRes.ok) {
      const data = await inningsRes.json();
      setInningsList(data);
      if (data.length > 0) setCurrentInnings(data[data.length - 1]);
    }
    const playersRes = await fetch(`/api/players?matchId=${matchId}`);
    if (playersRes.ok) setPlayers(await playersRes.json());
    setLoading(false);
  };

  const startInnings = async () => {
    if (!battingTeam || !bowlingTeam) return alert("Select both teams");
    const res = await fetch("/api/innings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_id: matchId, batting_team: battingTeam, bowling_team: bowlingTeam }),
    });
    if (res.ok) {
      setShowStartInnings(false);
      fetchData();
    } else alert("Failed to start innings");
  };

  const recordBall = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      innings_id: currentInnings!.id,
      over_number: parseInt(ballForm.over_number as any),
      ball_number: parseInt(ballForm.ball_number as any),
      batsman_id: ballForm.batsman_id ? parseInt(ballForm.batsman_id) : null,
      bowler_id: ballForm.bowler_id ? parseInt(ballForm.bowler_id) : null,
      runs: parseInt(ballForm.runs as any),
      is_wicket: ballForm.is_wicket,
      wicket_type: ballForm.wicket_type || null,
      extra_type: ballForm.extra_type || null,
      extra_runs: parseInt(ballForm.extra_runs as any) || 0,
    };
    const res = await fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      setBallForm({ over_number: 0, ball_number: 0, batsman_id: "", bowler_id: "", runs: 0, is_wicket: false, wicket_type: "", extra_type: "", extra_runs: 0 });
      fetchData(); // refresh innings totals
    } else alert("Failed to record");
    setSubmitting(false);
  };

  if (loading) return <div className="text-white">Loading scorecard...</div>;

  // Show start innings form if no innings yet
  if (inningsList.length === 0) {
    return (
      <div className="bg-[#0B1322] border border-[#28396C] rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">Start First Innings</h3>
        <div className="space-y-3">
          <select value={battingTeam} onChange={(e) => setBattingTeam(e.target.value)} className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white">
            <option value="">Batting Team</option>
            <option value="team_a">Team A</option>
            <option value="team_b">Team B</option>
          </select>
          <select value={bowlingTeam} onChange={(e) => setBowlingTeam(e.target.value)} className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white">
            <option value="">Bowling Team</option>
            <option value="team_a">Team A</option>
            <option value="team_b">Team B</option>
          </select>
          <button onClick={startInnings} className="px-4 py-2 bg-[#B5E18B] text-[#1F2A44] font-bold rounded">Start Innings</button>
        </div>
      </div>
    );
  }

  // Display current innings scorecard
  return (
    <div className="space-y-6">
      <div className="bg-[#0B1322] border border-[#28396C] rounded-lg p-4">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white">Innings {currentInnings?.innings_number}</h3>
          <div className="text-4xl font-mono font-bold text-[#B5E18B] my-2">
            {currentInnings?.total_runs}/{currentInnings?.total_wickets}
          </div>
          <div className="text-[#EAE6BC]">Overs: {Number(currentInnings?.overs || 0).toFixed(1)}</div>
          {/* <div className="text-[#EAE6BC]">Overs: {currentInnings?.overs?.toFixed(1) || "0.0"}</div> */}
          <div className="text-sm text-gray-400">Batting: {currentInnings?.batting_team === "team_a" ? "Team A" : "Team B"}</div>
        </div>
      </div>

      {/* Ball entry form */}
      <div className="bg-[#0B1322] border border-[#28396C] rounded-lg p-6">
        <h4 className="text-lg font-bold text-white mb-3">Record Ball</h4>
        <form onSubmit={recordBall} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input type="number" placeholder="Over" value={ballForm.over_number} onChange={(e) => setBallForm({ ...ballForm, over_number: parseInt(e.target.value) })} required className="px-3 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white"/>
          <input type="number" placeholder="Ball" value={ballForm.ball_number} onChange={(e) => setBallForm({ ...ballForm, ball_number: parseInt(e.target.value) })} required className="px-3 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white"/>
          <select value={ballForm.batsman_id} onChange={(e) => setBallForm({ ...ballForm, batsman_id: e.target.value })} className="px-3 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white">
            <option value="">Batsman</option>
            {players.filter(p => p.team === currentInnings?.batting_team).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={ballForm.bowler_id} onChange={(e) => setBallForm({ ...ballForm, bowler_id: e.target.value })} className="px-3 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white">
            <option value="">Bowler</option>
            {players.filter(p => p.team === currentInnings?.bowling_team).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="number" placeholder="Runs" value={ballForm.runs} onChange={(e) => setBallForm({ ...ballForm, runs: parseInt(e.target.value) })} className="px-3 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white"/>
          <label className="flex items-center gap-2 text-white"><input type="checkbox" checked={ballForm.is_wicket} onChange={(e) => setBallForm({ ...ballForm, is_wicket: e.target.checked })}/> Wicket</label>
          {ballForm.is_wicket && (
            <select value={ballForm.wicket_type} onChange={(e) => setBallForm({ ...ballForm, wicket_type: e.target.value })} className="px-3 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white">
              <option value="">Wicket type</option>
              <option value="bowled">Bowled</option>
              <option value="caught">Caught</option>
              <option value="run out">Run out</option>
              <option value="stumped">Stumped</option>
              <option value="lbw">LBW</option>
            </select>
          )}
          <select value={ballForm.extra_type} onChange={(e) => setBallForm({ ...ballForm, extra_type: e.target.value })} className="px-3 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white">
            <option value="">No extra</option>
            <option value="wide">Wide</option>
            <option value="no ball">No ball</option>
            <option value="bye">Bye</option>
            <option value="leg bye">Leg bye</option>
          </select>
          {ballForm.extra_type && <input type="number" placeholder="Extra runs" value={ballForm.extra_runs} onChange={(e) => setBallForm({ ...ballForm, extra_runs: parseInt(e.target.value) })} className="px-3 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white"/>}
          <button type="submit" disabled={submitting} className="col-span-full px-4 py-2 bg-[#B5E18B] text-[#1F2A44] font-bold rounded">{submitting ? "Recording..." : "Record Ball"}</button>
        </form>
      </div>
    </div>
  );
}