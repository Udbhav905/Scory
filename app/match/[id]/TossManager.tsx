"use client";

import { useEffect, useState } from "react";

export default function TossManager({ matchId, teamA, teamALogo, teamB, teamBLogo, onTossComplete }: { matchId: number; teamA: string; teamALogo?: string; teamB: string; teamBLogo?: string; onTossComplete: () => void }) {
  const [toss, setToss] = useState<any>(null);
  const [winner, setWinner] = useState("");
  const [decision, setDecision] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchToss(); }, [matchId]);

  const fetchToss = async () => {
    const res = await fetch(`/api/toss?matchId=${matchId}`);
    if (res.ok) {
      const data = await res.json();
      setToss(data);
      if (data) {
        setWinner(data.winner_team);
        setDecision(data.decision);
      }
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/toss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_id: matchId, winner_team: winner, decision }),
    });
    if (res.ok) {
      fetchToss();
      onTossComplete();
    } else alert("Failed to record toss");
    setSubmitting(false);
  };

  if (loading) return <div className="text-white">Loading toss info...</div>;

  const winnerTeamLabel = winner === "team_a" ? teamA : winner === "team_b" ? teamB : "";
  const decisionLabel = decision === "bat" ? "Bat first" : decision === "bowl" ? "Bowl first" : "";

  return (
    <div className="bg-[#0B1322] border border-[#28396C] rounded-lg p-6">
      {toss ? (
        <>
          <h3 className="text-xl font-bold text-white mb-2">Toss Completed</h3>
          <div className="flex items-center gap-4 mb-4">
            {winner === "team_a" && teamALogo && <img src={teamALogo} alt={teamA} className="w-12 h-12 rounded-full object-cover border border-[#28396C]" />}
            {winner === "team_b" && teamBLogo && <img src={teamBLogo} alt={teamB} className="w-12 h-12 rounded-full object-cover border border-[#28396C]" />}
            <p className="text-[#EAE6BC]">
              {winnerTeamLabel} won the toss and chose to {decisionLabel}.
            </p>
          </div>
          <button onClick={() => setToss(null)} className="text-sm text-[#B5E18B] hover:underline">Edit Toss</button>
        </>
      ) : (
        <>
          <h3 className="text-xl font-bold text-white mb-4">Toss</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <select value={winner} onChange={(e) => setWinner(e.target.value)} required className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white">
              <option value="">Who won the toss?</option>
              <option value="team_a">{teamA}</option>
              <option value="team_b">{teamB}</option>
            </select>
            <select value={decision} onChange={(e) => setDecision(e.target.value)} required className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white">
              <option value="">Chose to...</option>
              <option value="bat">Bat first</option>
              <option value="bowl">Bowl first</option>
            </select>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#B5E18B] text-[#1F2A44] font-bold rounded">{submitting ? "Saving..." : "Save Toss"}</button>
          </form>
        </>
      )}
    </div>
  );
}