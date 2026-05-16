"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Match {
  id: number;
  team_a_name: string;
  team_a_logo_url: string;
  team_b_name: string;
  team_b_logo_url: string;
  venue: string;
  match_date: string;
  total_overs: number;
  status: string;
}

interface Tournament {
  id: number;
  name: string;
  logo_url?: string;
  venue?: string;
  description?: string;
  status: string;
}

export default function TournamentDetailClient({ tournamentId }: { tournamentId: number }) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch tournament details
        const tournamentRes = await fetch(`/api/tournaments/${tournamentId}`);
        if (!tournamentRes.ok) throw new Error(`Tournament API returned ${tournamentRes.status}`);
        const tournamentData = await tournamentRes.json();
        setTournament(tournamentData);

        // Fetch matches for this tournament
        const matchesRes = await fetch(`/api/matches?tournamentId=${tournamentId}`);
        if (!matchesRes.ok) throw new Error(`Matches API returned ${matchesRes.status}`);
        const matchesData = await matchesRes.json();
        setMatches(matchesData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load tournament data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [tournamentId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading tournament...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  if (!tournament) return <div className="min-h-screen flex items-center justify-center text-white">Tournament not found</div>;

  // Helper to format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Date TBD";
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Helper to get status badge color
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      live: "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse",
      completed: "bg-green-500/20 text-green-400 border-green-500/30",
      cancelled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };
    return statusMap[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  return (
    <div className="min-h-screen bg-[#0a0c12] text-[#e8eaf0] py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <Link href="/" className="inline-flex items-center gap-2 text-[#7a8099] hover:text-[#3b6fd4] transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Tournament header */}
        <div className="bg-[#111520]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-6 mb-8">
          <div className="flex items-center gap-4">
            {tournament.logo_url && (
              <img src={tournament.logo_url} alt={tournament.name} className="w-16 h-16 rounded-xl object-cover" />
            )}
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">{tournament.name}</h1>
              {tournament.venue && <p className="text-[#7a8099] mt-1">📍 {tournament.venue}</p>}
              {tournament.description && <p className="text-sm text-[#a8dadc]/70 mt-2">{tournament.description}</p>}
            </div>
            <div className="ml-auto">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${getStatusBadge(tournament.status)}`}>
                {tournament.status}
              </span>
            </div>
          </div>
        </div>

        {/* Matches section */}
        <h2 className="text-xl font-black uppercase tracking-widest text-[#3b6fd4] mb-6">Matches</h2>
        {matches.length === 0 ? (
          <div className="bg-[#111520]/60 rounded-2xl border border-dashed border-white/10 py-16 text-center">
            <p className="text-[#7a8099]">No matches scheduled for this tournament yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {matches.map((match) => (
              <Link key={match.id} href={`/match/${match.id}`} className="block">
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="bg-[#111520]/60 backdrop-blur-xl rounded-xl border border-white/5 p-5 hover:border-[#3b6fd4]/30 transition-all h-full"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${getStatusBadge(match.status)}`}>
                      {match.status}
                    </span>
                    <span className="text-[10px] text-[#7a8099]">{formatDate(match.match_date)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col items-center gap-2 flex-1 text-center">
                      {match.team_a_logo_url ? (
                        <img src={match.team_a_logo_url} alt={match.team_a_name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#1a1f2e] flex items-center justify-center text-lg font-black text-[#3b6fd4]">
                          {match.team_a_name[0]}
                        </div>
                      )}
                      <span className="text-sm font-bold uppercase tracking-tight">{match.team_a_name}</span>
                    </div>
                    <span className="text-xs font-black text-[#7a8099]">VS</span>
                    <div className="flex flex-col items-center gap-2 flex-1 text-center">
                      {match.team_b_logo_url ? (
                        <img src={match.team_b_logo_url} alt={match.team_b_name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#1a1f2e] flex items-center justify-center text-lg font-black text-[#3b6fd4]">
                          {match.team_b_name[0]}
                        </div>
                      )}
                      <span className="text-sm font-bold uppercase tracking-tight">{match.team_b_name}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex justify-between text-[10px] text-[#7a8099]">
                    <span>🏟️ {match.venue || "TBA"}</span>
                    <span>{match.total_overs} overs</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}