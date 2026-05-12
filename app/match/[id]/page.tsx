"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import PlayersManager from "./PlayersManager";
import TossManager from "./TossManager";
import Scorecard from "./Scorecard";

export default function MatchDetailPage() {
  const { id } = useParams();
  const { data: session, status } = useSession();
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"players" | "toss" | "scorecard">("players");

  useEffect(() => {
    if (status === "authenticated") {
      fetchMatch();
    }
  }, [id, status]);

  const fetchMatch = async () => {
    const res = await fetch(`/api/matches/${id}`);
    if (res.ok) {
      setMatch(await res.json());
    }
    setLoading(false);
  };

  if (status === "loading" || loading) return <div className="min-h-screen bg-[#080C10] text-white p-8">Loading match...</div>;
  if (!match) return <div className="min-h-screen bg-[#080C10] text-white p-8">Match not found.</div>;

  return (
    <div className="min-h-screen bg-[#080C10] py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <h1 className="text-3xl font-['Barlow_Condensed'] font-bold text-[#F0F0F0]">
            {match.team_a_name} vs {match.team_b_name}
          </h1>
          <span className="text-xs px-2 py-1 rounded bg-[#1A253F] text-[#B5E18B] uppercase">{match.status}</span>
        </div>

        <div className="flex gap-4 border-b border-[#28396C] mb-6">
          <button onClick={() => setActiveTab("players")} className={`pb-2 px-1 font-bold uppercase tracking-wide transition ${activeTab === "players" ? "text-[#B5E18B] border-b-2 border-[#B5E18B]" : "text-gray-400"}`}>Players</button>
          <button onClick={() => setActiveTab("toss")} className={`pb-2 px-1 font-bold uppercase tracking-wide transition ${activeTab === "toss" ? "text-[#B5E18B] border-b-2 border-[#B5E18B]" : "text-gray-400"}`}>Toss</button>
          <button onClick={() => setActiveTab("scorecard")} className={`pb-2 px-1 font-bold uppercase tracking-wide transition ${activeTab === "scorecard" ? "text-[#B5E18B] border-b-2 border-[#B5E18B]" : "text-gray-400"}`}>Scorecard</button>
        </div>

        {activeTab === "players" && <PlayersManager matchId={parseInt(id as string)} teamA={match.team_a_name} teamB={match.team_b_name} />}
        {activeTab === "toss" && <TossManager matchId={parseInt(id as string)} teamA={match.team_a_name} teamB={match.team_b_name} onTossComplete={() => fetchMatch()} />}
        {activeTab === "scorecard" && (
          <Scorecard
            matchId={parseInt(id as string)}
            teamA={match.team_a_name}
            teamB={match.team_b_name}
            totalOvers={match.total_overs || 20}
          />
        )}
      </div>
    </div>
  );
}