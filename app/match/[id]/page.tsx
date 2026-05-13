"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import PlayersManager from "./PlayersManager";
import TossManager from "./TossManager";
import Scorecard from "./Scorecard";

export default function MatchDetailPage() {
  const { id } = useParams();
  const { data: session, status: authStatus } = useSession();
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"players" | "toss" | "scorecard">("scorecard");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetchMatch();
  }, [id]);

  const fetchMatch = async () => {
    const res = await fetch(`/api/matches/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMatch(data);
      setIsOwner(data.isOwner || false);
    }
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-[#080C10] text-white p-8">Loading match...</div>;
  if (!match) return <div className="min-h-screen bg-[#080C10] text-white p-8">Match not found.</div>;

  return (
    <div className="min-h-screen bg-[#080C10] py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Match Header with Logos */}
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 bg-[#0B1322] p-6 rounded-3xl border border-[#28396C]">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              {match.team_a_logo_url && <img src={match.team_a_logo_url} alt={match.team_a_name} className="w-16 h-16 rounded-full object-cover border-2 border-[#28396C]" />}
              <h1 className="text-3xl font-['Barlow_Condensed'] font-bold text-white uppercase">{match.team_a_name}</h1>
            </div>
            <div className="text-[#B5E18B] font-black italic text-xl">VS</div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-['Barlow_Condensed'] font-bold text-white uppercase">{match.team_b_name}</h1>
              {match.team_b_logo_url && <img src={match.team_b_logo_url} alt={match.team_b_name} className="w-16 h-16 rounded-full object-cover border-2 border-[#28396C]" />}
            </div>
          </div>
          <div className="flex-1 flex justify-end">
            <span className="text-xs px-3 py-1 rounded-full bg-[#1A253F] text-[#B5E18B] font-black uppercase tracking-widest border border-[#28396C]">{match.status}</span>
          </div>
        </div>

        {/* Tab Navigation – Owner only sees Players & Toss tabs */}
        <div className="flex gap-4 border-b border-[#28396C] mb-6 overflow-x-auto custom-scrollbar">
          {isOwner && (
            <>
              <button onClick={() => setActiveTab("players")} className={`pb-2 px-1 font-bold uppercase tracking-wide transition whitespace-nowrap ${activeTab === "players" ? "text-[#B5E18B] border-b-2 border-[#B5E18B]" : "text-gray-400"}`}>Players</button>
              <button onClick={() => setActiveTab("toss")} className={`pb-2 px-1 font-bold uppercase tracking-wide transition whitespace-nowrap ${activeTab === "toss" ? "text-[#B5E18B] border-b-2 border-[#B5E18B]" : "text-gray-400"}`}>Toss</button>
            </>
          )}
          <button onClick={() => setActiveTab("scorecard")} className={`pb-2 px-1 font-bold uppercase tracking-wide transition whitespace-nowrap ${activeTab === "scorecard" ? "text-[#B5E18B] border-b-2 border-[#B5E18B]" : "text-gray-400"}`}>Scorecard</button>
        </div>

        {/* Tab Content */}
        {activeTab === "players" && isOwner && (
          <PlayersManager
            matchId={parseInt(id as string)}
            teamA={match.team_a_name}
            teamALogo={match.team_a_logo_url}
            teamB={match.team_b_name}
            teamBLogo={match.team_b_logo_url}
          />
        )}
        {activeTab === "toss" && isOwner && (
          <TossManager
            matchId={parseInt(id as string)}
            teamA={match.team_a_name}
            teamALogo={match.team_a_logo_url}
            teamB={match.team_b_name}
            teamBLogo={match.team_b_logo_url}
            onTossComplete={() => fetchMatch()}
          />
        )}
        {activeTab === "scorecard" && (
          <Scorecard
            matchId={parseInt(id as string)}
            teamA={match.team_a_name}
            teamALogo={match.team_a_logo_url}
            teamB={match.team_b_name}
            teamBLogo={match.team_b_logo_url}
            totalOvers={match.total_overs || 20}
            matchStatus={match.status}
            isOwner={isOwner}
          />
        )}
      </div>
    </div>
  );
}