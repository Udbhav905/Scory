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

const BATTING_STYLES = ["Right-handed", "Left-handed", "Right-handed (Opener)", "Left-handed (Opener)", "Middle-order"];
const BOWLING_STYLES = ["Right-arm fast", "Left-arm fast", "Right-arm medium", "Left-arm medium", "Right-arm spin", "Left-arm spin", "Leg-spin", "Off-spin"];

export default function PlayersManager({ matchId, teamA, teamB }: { matchId: number; teamA: string; teamB: string }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<"team_a" | "team_b">("team_a");
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "batsman",
    batting_style: "",
    bowling_style: "",
    is_captain: false,
    is_wicketkeeper: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [captainError, setCaptainError] = useState("");

  useEffect(() => { fetchPlayers(); }, [matchId]);

  const fetchPlayers = async () => {
    const res = await fetch(`/api/players?matchId=${matchId}`);
    if (res.ok) setPlayers(await res.json());
    setLoading(false);
  };

  // Check if team already has a captain (excluding the player being edited)
  const teamHasCaptain = (team: string, excludePlayerId?: number) => {
    return players.some(p => p.team === team && p.is_captain && p.id !== excludePlayerId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCaptainError("");

    const teamToAssign = editingPlayer ? editingPlayer.team : selectedTeam;
    if (formData.is_captain && teamHasCaptain(teamToAssign, editingPlayer?.id)) {
      setCaptainError(`Only one captain allowed per team. This team already has a captain.`);
      return;
    }

    setSubmitting(true);
    const url = editingPlayer ? `/api/players` : "/api/players";
    const method = editingPlayer ? "PUT" : "POST";
    const payload = editingPlayer
      ? { id: editingPlayer.id, team: editingPlayer.team, ...formData }
      : { match_id: matchId, team: selectedTeam, ...formData };
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      resetForm();
      fetchPlayers();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to save player");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this player?")) return;
    const res = await fetch(`/api/players?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchPlayers();
  };

  const startEdit = (p: Player) => {
    setEditingPlayer(p);
    setSelectedTeam(p.team as "team_a" | "team_b");
    setFormData({
      name: p.name,
      role: p.role,
      batting_style: p.batting_style || "",
      bowling_style: p.bowling_style || "",
      is_captain: p.is_captain,
      is_wicketkeeper: p.is_wicketkeeper,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingPlayer(null);
    setFormData({ name: "", role: "batsman", batting_style: "", bowling_style: "", is_captain: false, is_wicketkeeper: false });
    setCaptainError("");
  };

  if (loading) return <div className="text-white">Loading players...</div>;

  const teamAPlayers = players.filter(p => p.team === "team_a");
  const teamBPlayers = players.filter(p => p.team === "team_b");

  return (
    <div className="space-y-6">
      {/* Add Player Form (collapsible) */}
      {showForm && (
        <div className="bg-[#0B1322] border border-[#28396C] rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">{editingPlayer ? `Edit Player (${editingPlayer.team === "team_a" ? teamA : teamB})` : `Add Player to ${selectedTeam === "team_a" ? teamA : teamB}`}</h3>
          {captainError && <div className="mb-3 p-2 bg-red-500/20 border border-red-500 rounded text-red-300 text-sm">{captainError}</div>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" placeholder="Player Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white"/>

            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white">
              <option value="batsman">Batsman</option>
              <option value="bowler">Bowler</option>
              <option value="all_rounder">All-rounder</option>
              <option value="wicketkeeper">Wicketkeeper</option>
            </select>

            <select value={formData.batting_style} onChange={(e) => setFormData({ ...formData, batting_style: e.target.value })} className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white">
              <option value="">Select Batting Style (optional)</option>
              {BATTING_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
            </select>

            <select value={formData.bowling_style} onChange={(e) => setFormData({ ...formData, bowling_style: e.target.value })} className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white">
              <option value="">Select Bowling Style (optional)</option>
              {BOWLING_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
            </select>

            <label className="flex items-center gap-2 text-white"><input type="checkbox" checked={formData.is_captain} onChange={(e) => setFormData({ ...formData, is_captain: e.target.checked })}/> Captain</label>
            <label className="flex items-center gap-2 text-white"><input type="checkbox" checked={formData.is_wicketkeeper} onChange={(e) => setFormData({ ...formData, is_wicketkeeper: e.target.checked })}/> Wicketkeeper</label>

            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#B5E18B] text-[#1F2A44] font-bold rounded">{submitting ? "Saving..." : (editingPlayer ? "Update" : "Add")}</button>
              <button type="button" onClick={resetForm} className="px-4 py-2 bg-transparent border border-[#28396C] text-[#A0A8B4] rounded">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Two separate tables for Team A and Team B */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Team A Table */}
        <div className="bg-[#0B1322] border border-[#28396C] rounded-lg overflow-hidden">
          <div className="bg-[#1A253F] px-4 py-3 flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#B5E18B]">{teamA}</h3>
            <button onClick={() => { setSelectedTeam("team_a"); setEditingPlayer(null); setFormData({ name: "", role: "batsman", batting_style: "", bowling_style: "", is_captain: false, is_wicketkeeper: false }); setShowForm(true); }} className="px-3 py-1 text-sm bg-[#B5E18B] text-[#1F2A44] font-bold rounded hover:bg-[#c8f0a2]">+ Add Player</button>
          </div>
          <div className="p-3">
            {teamAPlayers.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No players added yet</p>
            ) : (
              <div className="space-y-2">
                {teamAPlayers.map(p => (
                  <div key={p.id} className="border-b border-[#28396C]/50 pb-2 last:border-0 flex justify-between items-center">
                    <div>
                      <span className="font-medium text-white">{p.name}</span>
                      <span className="text-xs text-gray-400 ml-2">({p.role})</span>
                      {p.is_captain && <span className="ml-1 text-xs text-yellow-400">(C)</span>}
                      {p.is_wicketkeeper && <span className="ml-1 text-xs text-blue-400">(WK)</span>}
                      {p.batting_style && <span className="ml-2 text-xs text-gray-500">🏏 {p.batting_style}</span>}
                      {p.bowling_style && <span className="ml-2 text-xs text-gray-500">⚡ {p.bowling_style}</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(p)} className="text-xs text-[#B5E18B] hover:underline">Edit</button>
                      <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Team B Table */}
        <div className="bg-[#0B1322] border border-[#28396C] rounded-lg overflow-hidden">
          <div className="bg-[#1A253F] px-4 py-3 flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#B5E18B]">{teamB}</h3>
            <button onClick={() => { setSelectedTeam("team_b"); setEditingPlayer(null); setFormData({ name: "", role: "batsman", batting_style: "", bowling_style: "", is_captain: false, is_wicketkeeper: false }); setShowForm(true); }} className="px-3 py-1 text-sm bg-[#B5E18B] text-[#1F2A44] font-bold rounded hover:bg-[#c8f0a2]">+ Add Player</button>
          </div>
          <div className="p-3">
            {teamBPlayers.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No players added yet</p>
            ) : (
              <div className="space-y-2">
                {teamBPlayers.map(p => (
                  <div key={p.id} className="border-b border-[#28396C]/50 pb-2 last:border-0 flex justify-between items-center">
                    <div>
                      <span className="font-medium text-white">{p.name}</span>
                      <span className="text-xs text-gray-400 ml-2">({p.role})</span>
                      {p.is_captain && <span className="ml-1 text-xs text-yellow-400">(C)</span>}
                      {p.is_wicketkeeper && <span className="ml-1 text-xs text-blue-400">(WK)</span>}
                      {p.batting_style && <span className="ml-2 text-xs text-gray-500">🏏 {p.batting_style}</span>}
                      {p.bowling_style && <span className="ml-2 text-xs text-gray-500">⚡ {p.bowling_style}</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(p)} className="text-xs text-[#B5E18B] hover:underline">Edit</button>
                      <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}