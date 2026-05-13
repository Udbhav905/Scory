"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Match {
  id: number;
  team_a_name: string;
  team_a_logo_url: string;
  team_b_name: string;
  team_b_logo_url: string;
  venue: string;
  match_date: string;
  status: string;
  tournament_name: string;
}

interface Tournament {
  id: number;
  name: string;
  logo_url: string;
  venue: string;
  status: string;
}

export default function Dashboard() {
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (query = "") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/dashboard?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLiveMatches(data.liveMatches || []);
      setRecentMatches(data.recentMatches || []);
      setTournaments(data.tournaments || []);
    } catch (err) {
      console.error(err);
      setError("Could not load dashboard data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(searchTerm);
  };

  return (
    <div className="min-h-screen bg-ink-black text-alabaster-grey font-sans selection:bg-dusk-blue selection:text-white">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-prussian-blue/20 to-transparent"></div>
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="inline-block px-4 py-1.5 rounded-full bg-prussian-blue/40 border border-lavender-grey/10 text-lavender-grey text-[10px] font-black uppercase tracking-[0.4em] mb-6">
              Next-Gen Cricket Tracking
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic text-alabaster-grey mb-8">
              FIND YOUR <span className="text-dusk-blue">MATCH</span>
            </h1>
          </motion.div>

          <form onSubmit={handleSearch} className="relative group max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Search teams, tournaments or venues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-prussian-blue/30 border-2 border-lavender-grey/10 rounded-3xl py-6 px-16 focus:outline-none focus:border-dusk-blue/50 focus:ring-4 focus:ring-dusk-blue/10 transition-all text-xl text-alabaster-grey placeholder:text-lavender-grey/30"
            />
            <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-lavender-grey/40 group-focus-within:text-dusk-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 bg-dusk-blue text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-lavender-grey hover:text-ink-black transition-all shadow-xl shadow-dusk-blue/20">
              SEARCH
            </button>
          </form>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 pb-32">
        {error && (
          <div className="mb-12 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-center text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Live Matches */}
        <section className="mb-24">
          <div className="flex items-center gap-6 mb-12">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-lavender-grey">Live Broadcast</h2>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-lavender-grey/10 to-transparent"></div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => <div key={i} className="h-72 glass animate-pulse rounded-[3rem]"></div>)}
            </div>
          ) : liveMatches.length === 0 ? (
            <div className="text-center py-24 glass rounded-[3rem] border border-dashed border-lavender-grey/10">
              <p className="text-lavender-grey/30 font-black uppercase tracking-[0.3em] text-sm">
                {searchTerm ? "No live matches match your search" : "No matches currently in progress"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {liveMatches.map((match) => (
                <Link key={match.id} href={`/match/${match.id}`}>
                  <motion.div 
                    whileHover={{ y: -10, scale: 1.02 }}
                    className="glass p-10 rounded-[3rem] border border-lavender-grey/5 shadow-2xl relative overflow-hidden group hover:border-dusk-blue/30 transition-all"
                  >
                    <div className="absolute top-0 right-0 p-10 opacity-[0.02] text-7xl font-black italic select-none">LIVE</div>
                    <div className="text-[10px] text-dusk-blue font-black uppercase tracking-widest mb-8">{match.tournament_name || "Major Series"}</div>
                    
                    <div className="flex justify-between items-center gap-6 relative z-10">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-3xl bg-ink-black border border-lavender-grey/10 flex items-center justify-center overflow-hidden shadow-2xl group-hover:border-dusk-blue/50 transition-colors">
                          {match.team_a_logo_url ? <img src={match.team_a_logo_url} className="w-full h-full object-cover" /> : <span className="text-2xl font-black">{match.team_a_name[0]}</span>}
                        </div>
                        <span className="text-xs font-black uppercase tracking-tighter text-alabaster-grey">{match.team_a_name}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-lavender-grey/20 font-black italic text-3xl mb-2">VS</span>
                        <div className="px-3 py-1 bg-red-500/10 rounded-full text-[8px] font-black text-red-400 uppercase tracking-widest border border-red-500/20">Active</div>
                      </div>
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-3xl bg-ink-black border border-lavender-grey/10 flex items-center justify-center overflow-hidden shadow-2xl group-hover:border-dusk-blue/50 transition-colors">
                          {match.team_b_logo_url ? <img src={match.team_b_logo_url} className="w-full h-full object-cover" /> : <span className="text-2xl font-black">{match.team_b_name[0]}</span>}
                        </div>
                        <span className="text-xs font-black uppercase tracking-tighter text-alabaster-grey">{match.team_b_name}</span>
                      </div>
                    </div>
                    
                    <div className="mt-10 pt-8 border-t border-lavender-grey/5 flex justify-between items-center text-[10px] font-black text-lavender-grey/40 uppercase tracking-[0.2em]">
                      <span>{match.venue}</span>
                      <span className="text-dusk-blue group-hover:text-alabaster-grey transition-colors">Enter Arena →</span>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Matches & Tournaments */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-6 mb-10">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-lavender-grey">Recently Concluded</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-lavender-grey/10 to-transparent"></div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-24 glass animate-pulse rounded-3xl"></div>)}
              </div>
            ) : recentMatches.length === 0 ? (
              <div className="text-center py-12 glass rounded-3xl border border-dashed border-lavender-grey/10">
                <p className="text-lavender-grey/30 text-sm">No completed matches found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {recentMatches.map((match) => (
                  <Link key={match.id} href={`/match/${match.id}`}>
                    <motion.div 
                      whileHover={{ x: 15 }}
                      className="glass p-8 rounded-3xl border border-lavender-grey/5 hover:bg-prussian-blue/20 transition-all flex flex-col md:flex-row justify-between items-center gap-8"
                    >
                      <div className="flex items-center gap-8 flex-1">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black uppercase tracking-tighter">{match.team_a_name}</span>
                          <div className="w-10 h-10 rounded-xl bg-ink-black flex items-center justify-center text-xs font-black border border-lavender-grey/10">{match.team_a_name[0]}</div>
                        </div>
                        <span className="text-lavender-grey/10 font-black italic text-sm uppercase">vs</span>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-ink-black flex items-center justify-center text-xs font-black border border-lavender-grey/10">{match.team_b_name[0]}</div>
                          <span className="text-sm font-black uppercase tracking-tighter">{match.team_b_name}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-lavender-grey/30 font-black uppercase tracking-widest flex items-center gap-6">
                        <span>{match.tournament_name}</span>
                        <span className="px-3 py-1 bg-ink-black rounded-lg border border-lavender-grey/10">Finished</span>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Tournaments Section - Now shows ALL tournaments */}
          <div>
            <div className="flex items-center gap-6 mb-10">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-lavender-grey">All Tournaments</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-lavender-grey/10 to-transparent"></div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-28 glass animate-pulse rounded-2xl"></div>)}
              </div>
            ) : tournaments.length === 0 ? (
              <div className="text-center py-12 glass rounded-2xl border border-dashed border-lavender-grey/10">
                <p className="text-lavender-grey/30 text-xs">No tournaments found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {tournaments.map((t) => (
                  <motion.div key={t.id} whileHover={{ scale: 1.02 }} className="glass p-6 rounded-[2rem] border border-lavender-grey/5 hover:border-dusk-blue/20 transition-all">
                    <div className="flex items-center gap-5 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-ink-black border border-lavender-grey/10 flex items-center justify-center overflow-hidden">
                        {t.logo_url ? <img src={t.logo_url} className="w-full h-full object-cover" /> : <span className="text-xl font-black">T</span>}
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-alabaster-grey mb-1">{t.name}</h3>
                        <p className="text-[9px] text-lavender-grey/40 font-bold uppercase">{t.venue}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em]">
                      <span className={`${t.status === 'active' ? 'text-green-400' : 'text-dusk-blue'}`}>{t.status || 'upcoming'}</span>
                      <span className="text-lavender-grey/20 italic">Global Series</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="py-20 border-t border-lavender-grey/5 text-center bg-prussian-blue/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-3xl font-black tracking-tighter uppercase italic text-lavender-grey/10 mb-8 select-none">SCORY</div>
          <p className="text-[9px] text-lavender-grey/20 font-black uppercase tracking-[0.8em]">End-to-End Real-Time Analytics Engine</p>
        </div>
      </footer>
    </div>
  );
}