"use client";

import { useEffect, useState } from "react";

interface Player {
  id: number;
  name: string;
  team: string;
  role: string;
  batting_style?: string;
  bowling_style?: string;
  is_captain: boolean;
  is_wicketkeeper: boolean;
}

export default function PlayersManager({ matchId, teamA, teamB }: { matchId: number; teamA: string; teamB: string }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    team: "team_a",
    role: "batsman",
    batting_style: "",
    bowling_style: "",
    is_captain: false,
    is_wicketkeeper: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchPlayers(); }, [matchId]);

  const fetchPlayers = async () => {
    const res = await fetch(`/api/players?matchId=${matchId}`);
    if (res.ok) setPlayers(await res.json());
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const url = editingPlayer ? `/api/players` : "/api/players";
    const method = editingPlayer ? "PUT" : "POST";
    const payload = editingPlayer ? { id: editingPlayer.id, ...formData } : { match_id: matchId, ...formData };
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      setShowForm(false);
      setEditingPlayer(null);
      setFormData({ name: "", team: "team_a", role: "batsman", batting_style: "", bowling_style: "", is_captain: false, is_wicketkeeper: false });
      fetchPlayers();
    } else alert("Failed to save player");
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this player?")) return;
    const res = await fetch(`/api/players?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchPlayers();
  };

  const startEdit = (p: Player) => {
    setEditingPlayer(p);
    setFormData({
      name: p.name,
      team: p.team,
      role: p.role,
      batting_style: p.batting_style || "",
      bowling_style: p.bowling_style || "",
      is_captain: p.is_captain,
      is_wicketkeeper: p.is_wicketkeeper,
    });
    setShowForm(true);
  };

  if (loading) return <div className="text-white">Loading players...</div>;

  const teamAPlayers = players.filter(p => p.team === "team_a");
  const teamBPlayers = players.filter(p => p.team === "team_b");

  return (
    <div className="space-y-4">
      <button onClick={() => { setEditingPlayer(null); setFormData({ name: "", team: "team_a", role: "batsman", batting_style: "", bowling_style: "", is_captain: false, is_wicketkeeper: false }); setShowForm(!showForm); }} className="px-4 py-2 bg-[#B5E18B] text-[#1F2A44] font-bold rounded">{showForm ? "Cancel" : "+ Add Player"}</button>

      {showForm && (
        <div className="bg-[#0B1322] border border-[#28396C] rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">{editingPlayer ? "Edit Player" : "New Player"}</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" placeholder="Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white"/>
            <select value={formData.team} onChange={(e) => setFormData({ ...formData, team: e.target.value })} className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white">
              <option value="team_a">{teamA}</option>
              <option value="team_b">{teamB}</option>
            </select>
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white">
              <option value="batsman">Batsman</option>
              <option value="bowler">Bowler</option>
              <option value="all_rounder">All-rounder</option>
              <option value="wicketkeeper">Wicketkeeper</option>
            </select>
            <input type="text" placeholder="Batting style (optional)" value={formData.batting_style} onChange={(e) => setFormData({ ...formData, batting_style: e.target.value })} className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white"/>
            <input type="text" placeholder="Bowling style (optional)" value={formData.bowling_style} onChange={(e) => setFormData({ ...formData, bowling_style: e.target.value })} className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white"/>
            <label className="flex items-center gap-2 text-white"><input type="checkbox" checked={formData.is_captain} onChange={(e) => setFormData({ ...formData, is_captain: e.target.checked })}/> Captain</label>
            <label className="flex items-center gap-2 text-white"><input type="checkbox" checked={formData.is_wicketkeeper} onChange={(e) => setFormData({ ...formData, is_wicketkeeper: e.target.checked })}/> Wicketkeeper</label>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#B5E18B] text-[#1F2A44] font-bold rounded">{submitting ? "Saving..." : (editingPlayer ? "Update" : "Add")}</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Team A */}
        <div className="bg-[#0B1322] border border-[#28396C] rounded-lg p-3">
          <h3 className="text-lg font-bold text-[#B5E18B] mb-2">{teamA}</h3>
          {teamAPlayers.length === 0 ? (
            <p className="text-gray-400 text-sm">No players yet</p>
          ) : (
            <div className="space-y-2">
              {teamAPlayers.map(p => (
                <div key={p.id} className="border-b border-[#28396C]/50 pb-2 last:border-0 flex justify-between items-center">
                  <div>
                    <span className="font-medium text-white">{p.name}</span>
                    <span className="text-xs text-gray-400 ml-2">({p.role})</span>
                    {p.is_captain && <span className="ml-1 text-xs text-yellow-400">(C)</span>}
                    {p.is_wicketkeeper && <span className="ml-1 text-xs text-blue-400">(WK)</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(p)} className="text-xs text-[#B5E18B]">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team B */}
        <div className="bg-[#0B1322] border border-[#28396C] rounded-lg p-3">
          <h3 className="text-lg font-bold text-[#B5E18B] mb-2">{teamB}</h3>
          {teamBPlayers.length === 0 ? (
            <p className="text-gray-400 text-sm">No players yet</p>
          ) : (
            <div className="space-y-2">
              {teamBPlayers.map(p => (
                <div key={p.id} className="border-b border-[#28396C]/50 pb-2 last:border-0 flex justify-between items-center">
                  <div>
                    <span className="font-medium text-white">{p.name}</span>
                    <span className="text-xs text-gray-400 ml-2">({p.role})</span>
                    {p.is_captain && <span className="ml-1 text-xs text-yellow-400">(C)</span>}
                    {p.is_wicketkeeper && <span className="ml-1 text-xs text-blue-400">(WK)</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(p)} className="text-xs text-[#B5E18B]">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}