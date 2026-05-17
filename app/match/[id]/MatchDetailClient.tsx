"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import PlayersManager from "./PlayersManager";
import TossManager from "./TossManager";
import Scorecard from "./Scorecard";
import Link from "next/link";

interface Props {
  matchi: any;
  matchId: number;
}

export default function MatchDetailClient({ matchi, matchId }: Props) { 
   const { id } = useParams();
  const { data: session, status: authStatus } = useSession();
  
  const [match, setMatch] = useState<any>(matchi);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"players" | "toss" | "scorecard">("scorecard");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetchMatch();
  }, [id]);
  const numericId = parseInt(id as string);
  if (isNaN(numericId)) notFound();

  const fetchMatch = async () => {
     if (isNaN(numericId)) return;
    const res = await fetch(`/api/matches/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMatch(data);
      setIsOwner(data.isOwner || false);
    }
  };

  if (!match) return <div className="min-h-screen bg-[#080C10] text-white p-8">Match not found.</div>;

  return (
    <div className="min-h-screen bg-[#080C10] py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Match Header with Logos */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 bg-[#0B1322] p-6 rounded-3xl border border-[#28396C] w-full">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 w-full md:w-auto">
            {/* Team A */}
            <div className="flex items-center gap-3">
              {match.team_a_logo_url && (
                <img
                  src={match.team_a_logo_url}
                  alt={match.team_a_name}
                  className="w-10 h-10 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-[#28396C] shrink-0"
                />
              )}
              <h1 className="text-xl sm:text-3xl font-['Barlow_Condensed'] font-bold text-white uppercase tracking-tight truncate max-w-[120px] sm:max-w-none">
                {match.team_a_name}
              </h1>
            </div>
            
            {/* VS Badge */}
            <div className="text-[#B5E18B] font-black italic text-sm sm:text-lg px-2.5 py-1 bg-[#1A253F] rounded-lg border border-[#28396C]/50 shadow-[0_0_10px_rgba(181,225,139,0.05)]">
              VS
            </div>
            
            {/* Team B */}
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-3xl font-['Barlow_Condensed'] font-bold text-white uppercase tracking-tight truncate max-w-[120px] sm:max-w-none">
                {match.team_b_name}
              </h1>
              {match.team_b_logo_url && (
                <img
                  src={match.team_b_logo_url}
                  alt={match.team_b_name}
                  className="w-10 h-10 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-[#28396C] shrink-0"
                />
              )}
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="w-full md:w-auto flex justify-center md:justify-end shrink-0">
            <span className="text-[10px] sm:text-xs px-4 py-1.5 rounded-full bg-[#1A253F] text-[#B5E18B] font-black uppercase tracking-[0.15em] border border-[#B5E18B]/30 shadow-[0_0_12px_rgba(181,225,139,0.15)]">
              {match.status}
            </span>
          </div>
        </div>

        {/* Tab Navigation – Owner only sees Players & Toss tabs */}
        <div className="flex gap-4 border-b border-[#28396C] mb-6 overflow-x-auto custom-scrollbar">
          {isOwner && (
            <>
              <button onClick={() => setActiveTab("players")} className={`pb-2 px-1 font-bold uppercase tracking-wide transition whitespace-nowrap ${activeTab === "players" ? "text-[#B5E18B] border-b-2 border-[#B5E18B]" : "text-gray-400"}`}>
                Players
              </button>
              <button onClick={() => setActiveTab("toss")} className={`pb-2 px-1 font-bold uppercase tracking-wide transition whitespace-nowrap ${activeTab === "toss" ? "text-[#B5E18B] border-b-2 border-[#B5E18B]" : "text-gray-400"}`}>
                Toss
              </button>
            </>
          )}
          <button onClick={() => setActiveTab("scorecard")} className={`pb-2 px-1 font-bold uppercase tracking-wide transition whitespace-nowrap ${activeTab === "scorecard" ? "text-[#B5E18B] border-b-2 border-[#B5E18B]" : "text-gray-400"}`}>
            Scorecard
          </button>
           
        <Link href={`/match/${id}/analysis`}>Analysis</Link>
        </div>

        {/* Tab Content */}
        {activeTab === "players" && isOwner && <PlayersManager matchId={parseInt(id as string)} teamA={match.team_a_name} teamALogo={match.team_a_logo_url} teamB={match.team_b_name} teamBLogo={match.team_b_logo_url} />}
        {activeTab === "toss" && isOwner && <TossManager matchId={parseInt(id as string)} teamA={match.team_a_name} teamALogo={match.team_a_logo_url} teamB={match.team_b_name} teamBLogo={match.team_b_logo_url} onTossComplete={() => fetchMatch()} />}
        {activeTab === "scorecard" && <Scorecard matchId={parseInt(id as string)} teamA={match.team_a_name} teamALogo={match.team_a_logo_url} teamB={match.team_b_name} teamBLogo={match.team_b_logo_url} totalOvers={match.total_overs || 20} matchStatus={match.status} isOwner={isOwner} />}
      </div>
    </div>
  );
}
