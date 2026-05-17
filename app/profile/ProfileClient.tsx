"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Session } from "next-auth";

interface ProfileClientProps {
  session: Session;
}

export default function ProfileClient({ session }: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "tournaments">("profile");
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [viewMatches, setViewMatches] = useState(false);

  // ✅ No useSession, no redirect useEffect

  return (
    <div className="min-h-screen bg-[#0a0c12] py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-[#e8eaf0] mb-8">Dashboard</h1>

        <div className="flex gap-6 border-b border-[#28396C] mb-8">
          <button
            onClick={() => {
              setActiveTab("profile");
              setViewMatches(false);
              setSelectedTournament(null);
            }}
            className={`pb-3 px-1 text-sm font-black uppercase tracking-wider transition ${
              activeTab === "profile"
                ? "text-[#B5E18B] border-b-2 border-[#B5E18B]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            My Profile
          </button>
          <button
            onClick={() => {
              setActiveTab("tournaments");
              setViewMatches(false);
              setSelectedTournament(null);
            }}
            className={`pb-3 px-1 text-sm font-black uppercase tracking-wider transition ${
              activeTab === "tournaments"
                ? "text-[#B5E18B] border-b-2 border-[#B5E18B]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            My Tournaments
          </button>
        </div>

        {activeTab === "profile" && <ProfileSection />}
        {activeTab === "tournaments" &&
          (viewMatches && selectedTournament ? (
            <MatchesManager tournament={selectedTournament} onBack={() => setViewMatches(false)} />
          ) : (
            <TournamentsSection
              onManageMatches={(tournament) => {
                setSelectedTournament(tournament);
                setViewMatches(true);
              }}
            />
          ))}
      </div>
    </div>
  );
}

// ================== COPY YOUR EXISTING ProfileSection, TournamentsSection, MatchesManager HERE ==================

function ProfileSection() {
  const [user, setUser] = useState({ name: "", email: "", mobile: "" });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    const res = await fetch("/api/user/profile");
    if (res.ok) setUser(await res.json());
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: user.name, mobile: user.mobile }),
    });
    setMessage(res.ok ? "Profile updated!" : "Failed to update.");
    setUpdating(false);
  };

  if (loading)
    return (
      <div className="bg-[#111520]/80 rounded-2xl p-6 text-center">
        <div className="text-[#a8dadc]">Loading profile...</div>
      </div>
    );

  return (
    <div className="bg-[#111520]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-6 md:p-8 max-w-2xl">
      <h2 className="text-2xl font-black text-white mb-6">Edit Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[#a8dadc] mb-1">Full Name</label>
          <input
            type="text"
            value={user.name}
            onChange={(e) => setUser({ ...user, name: e.target.value })}
            required
            className="w-full px-4 py-2.5 bg-[#1A253F] border border-[#28396C] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#B5E18B] transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#a8dadc] mb-1">Email (read‑only)</label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full px-4 py-2.5 bg-[#1A253F]/50 border border-[#28396C] rounded-xl text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#a8dadc] mb-1">Mobile Number</label>
          <input
            type="tel"
            value={user.mobile || ""}
            onChange={(e) => setUser({ ...user, mobile: e.target.value })}
            className="w-full px-4 py-2.5 bg-[#1A253F] border border-[#28396C] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#B5E18B] transition"
          />
        </div>
        {message && (
          <div
            className={`text-sm font-medium p-2 rounded-lg ${
              message.includes("updated") ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            }`}
          >
            {message}
          </div>
        )}
        <button
          type="submit"
          disabled={updating}
          className="w-full md:w-auto px-6 py-2.5 bg-[#B5E18B] text-[#1F2A44] font-bold uppercase tracking-wide rounded-xl hover:bg-[#c8f0a2] transition disabled:opacity-50"
        >
          {updating ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

// ================== TOURNAMENTS SECTION ==================
function TournamentsSection({ onManageMatches }: { onManageMatches: (tournament: any) => void }) {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    venue: "",
    start_date: "",
    end_date: "",
    logo_url: "",
    description: "",
    status: "draft",
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    const res = await fetch("/api/tournaments");
    if (res.ok) setTournaments(await res.json());
    setLoading(false);
  };

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    return data.url;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file);
    setFormData((prev) => ({ ...prev, logo_url: url }));
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate dates
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end < start) {
        alert("End date must be after start date.");
        return;
      }
    }
    setSubmitting(true);
    const payload = {
      id: editingTournament ? editingTournament.id : undefined,
      name: formData.name,
      venue: formData.venue || null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      logo_url: formData.logo_url || null,
      description: formData.description || null,
      status: formData.status,
    };
    const url = "/api/tournaments";
    const method = editingTournament ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setFormData({
        name: "",
        venue: "",
        start_date: "",
        end_date: "",
        logo_url: "",
        description: "",
        status: "draft",
      });
      setShowCreateForm(false);
      setEditingTournament(null);
      fetchTournaments();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to save tournament");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this tournament and all its matches?")) return;
    const res = await fetch(`/api/tournaments?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchTournaments();
    else alert("Delete failed");
  };

  const startEdit = (t: any) => {
    setEditingTournament(t);
    setFormData({
      name: t.name,
      venue: t.venue || "",
      start_date: t.start_date?.split("T")[0] || "",
      end_date: t.end_date?.split("T")[0] || "",
      logo_url: t.logo_url || "",
      description: t.description || "",
      status: t.status || "draft",
    });
    setShowCreateForm(true);
  };

  if (loading)
    return (
      <div className="bg-[#111520]/80 rounded-2xl p-8 text-center">
        <div className="text-[#a8dadc]">Loading tournaments...</div>
      </div>
    );

  return (
    <div className="space-y-6">
      <button
        onClick={() => {
          setEditingTournament(null);
          setFormData({
            name: "",
            venue: "",
            start_date: "",
            end_date: "",
            logo_url: "",
            description: "",
            status: "draft",
          });
          setShowCreateForm(!showCreateForm);
        }}
        className="px-5 py-2.5 bg-[#B5E18B] text-[#1F2A44] font-black uppercase tracking-wider rounded-xl hover:bg-[#c8f0a2] transition"
      >
        {showCreateForm ? "Cancel" : "+ Create Tournament"}
      </button>

      {showCreateForm && (
        <div className="bg-[#111520]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-6 md:p-8">
          <h3 className="text-xl font-black text-white mb-5">
            {editingTournament ? "Edit Tournament" : "New Tournament"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Tournament Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2.5 bg-[#1A253F] border border-[#28396C] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#B5E18B]"
            />
            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 bg-[#1A253F] border border-[#28396C] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#B5E18B]"
            />
            <input
              type="text"
              placeholder="Venue"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#1A253F] border border-[#28396C] rounded-xl text-white"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="px-4 py-2.5 bg-[#1A253F] border border-[#28396C] rounded-xl text-white"
              />
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="px-4 py-2.5 bg-[#1A253F] border border-[#28396C] rounded-xl text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a8dadc] mb-1">Tournament Logo</label>
              <input type="file" accept="image/*" onChange={handleFileChange} className="text-white" />
              {uploading && <span className="ml-2 text-sm text-[#B5E18B]">Uploading...</span>}
              {formData.logo_url && (
                <img src={formData.logo_url} alt="logo" className="h-12 mt-3 rounded-lg object-cover border border-white/20" />
              )}
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-[#B5E18B] text-[#1F2A44] font-black uppercase tracking-wider rounded-xl hover:bg-[#c8f0a2] transition disabled:opacity-50"
              >
                {submitting ? "Saving..." : editingTournament ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingTournament(null);
                }}
                className="px-6 py-2.5 bg-transparent border border-[#28396C] text-[#a8dadc] font-black uppercase tracking-wider rounded-xl hover:bg-white/5 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {tournaments.length === 0 ? (
        <div className="bg-[#111520]/60 rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-[#a8dadc]/60">No tournaments yet. Create your first tournament above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="bg-[#111520]/80 backdrop-blur-xl rounded-2xl border border-white/5 hover:border-[#3b6fd4]/30 transition-all p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                {t.logo_url ? (
                  <img src={t.logo_url} alt={t.name} className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#1A253F] flex items-center justify-center text-2xl font-black text-[#3b6fd4]">
                    {t.name[0]}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-black text-white line-clamp-1">{t.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#1A253F] text-[#B5E18B] uppercase">{t.status}</span>
                </div>
              </div>
              {t.description && <p className="text-sm text-[#a8dadc]/80 mt-1 line-clamp-2">{t.description}</p>}
              {t.venue && (
                <p className="text-sm text-[#a8dadc]/60 flex items-center gap-1 mt-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {t.venue}
                </p>
              )}
              {(t.start_date || t.end_date) && (
                <p className="text-xs text-[#a8dadc]/50 mt-2">
                  📅 {t.start_date && new Date(t.start_date).toLocaleDateString()} {t.end_date && `→ ${new Date(t.end_date).toLocaleDateString()}`}
                </p>
              )}
              <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
                <button
                  onClick={() => startEdit(t)}
                  className="flex-1 py-1.5 text-xs bg-[#28396C] text-white rounded-lg hover:bg-[#3F5F9E] transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => onManageMatches(t)}
                  className="flex-1 py-1.5 text-xs bg-[#B5E18B] text-[#1F2A44] font-bold rounded-lg hover:bg-[#c8f0a2] transition"
                >
                  Manage Matches
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="py-1.5 px-3 text-xs bg-red-600/70 text-white rounded-lg hover:bg-red-600 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ================== MATCHES MANAGER (with tournament date validation) ==================
function MatchesManager({ tournament, onBack }: { tournament: any; onBack: () => void }) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [matchForm, setMatchForm] = useState({
    team_a_name: "",
    team_a_logo_url: "",
    team_b_name: "",
    team_b_logo_url: "",
    venue: "",
    match_date: "",
    total_overs: 20,
  });
  const [uploadingTeamA, setUploadingTeamA] = useState(false);
  const [uploadingTeamB, setUploadingTeamB] = useState(false);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    const res = await fetch(`/api/matches?tournamentId=${tournament.id}`);
    if (res.ok) setMatches(await res.json());
    setLoading(false);
  };

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    return data.url;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: "A" | "B") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (side === "A") setUploadingTeamA(true);
    else setUploadingTeamB(true);
    const url = await uploadImage(file);
    if (side === "A") setMatchForm((prev) => ({ ...prev, team_a_logo_url: url }));
    else setMatchForm((prev) => ({ ...prev, team_b_logo_url: url }));
    if (side === "A") setUploadingTeamA(false);
    else setUploadingTeamB(false);
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate match date against tournament start/end dates
    if (matchForm.match_date) {
      const matchDate = new Date(matchForm.match_date);
      const start = tournament.start_date ? new Date(tournament.start_date) : null;
      const end = tournament.end_date ? new Date(tournament.end_date) : null;
      if (start && matchDate < start) {
        alert(`Match date cannot be before tournament start date (${new Date(start).toLocaleDateString()}).`);
        return;
      }
      if (end && matchDate > end) {
        alert(`Match date cannot be after tournament end date (${new Date(end).toLocaleDateString()}).`);
        return;
      }
    }

    setSubmitting(true);
    const payload = {
      tournament_id: tournament.id,
      ...matchForm,
      match_date: matchForm.match_date || null,
      total_overs: matchForm.total_overs,
    };
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setMatchForm({
        team_a_name: "",
        team_a_logo_url: "",
        team_b_name: "",
        team_b_logo_url: "",
        venue: "",
        match_date: "",
        total_overs: 20,
      });
      setShowCreateMatch(false);
      fetchMatches();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to create match");
    }
    setSubmitting(false);
  };

  const handleDeleteMatch = async (matchId: number) => {
    if (!confirm("Delete this match?")) return;
    const res = await fetch(`/api/matches?id=${matchId}`, { method: "DELETE" });
    if (res.ok) fetchMatches();
    else alert("Delete failed");
  };

  // Format date for min/max attributes
  const minDate = tournament.start_date ? `${tournament.start_date.split("T")[0]}T00:00` : undefined;
  const maxDate = tournament.end_date ? `${tournament.end_date.split("T")[0]}T23:59` : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <button onClick={onBack} className="text-[#B5E18B] hover:underline flex items-center gap-1">
          ← Back to Tournaments
        </button>
        <button
          onClick={() => setShowCreateMatch(!showCreateMatch)}
          className="px-5 py-2 bg-[#B5E18B] text-[#1F2A44] font-black uppercase tracking-wider rounded-xl hover:bg-[#c8f0a2] transition"
        >
          {showCreateMatch ? "Cancel" : "+ Add Match"}
        </button>
      </div>
      <h2 className="text-2xl font-black text-white">{tournament.name} – Matches</h2>

      {showCreateMatch && (
        <div className="bg-[#111520]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-6 md:p-8">
          <h3 className="text-xl font-black text-white mb-5">Add New Match</h3>
          <form onSubmit={handleCreateMatch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-[#a8dadc] mb-1">Team A Name *</label>
                <input
                  type="text"
                  value={matchForm.team_a_name}
                  onChange={(e) => setMatchForm({ ...matchForm, team_a_name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-[#1A253F] border border-[#28396C] rounded-xl text-white"
                />
                <label className="block text-sm font-medium text-[#a8dadc] mt-3">Team A Logo</label>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "A")} className="text-white text-sm" />
                {uploadingTeamA && <span className="text-xs text-[#B5E18B] ml-2">Uploading...</span>}
                {matchForm.team_a_logo_url && (
                  <img src={matchForm.team_a_logo_url} alt="Team A logo" className="h-10 mt-2 rounded-lg object-cover" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#a8dadc] mb-1">Team B Name *</label>
                <input
                  type="text"
                  value={matchForm.team_b_name}
                  onChange={(e) => setMatchForm({ ...matchForm, team_b_name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-[#1A253F] border border-[#28396C] rounded-xl text-white"
                />
                <label className="block text-sm font-medium text-[#a8dadc] mt-3">Team B Logo</label>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "B")} className="text-white text-sm" />
                {uploadingTeamB && <span className="text-xs text-[#B5E18B] ml-2">Uploading...</span>}
                {matchForm.team_b_logo_url && (
                  <img src={matchForm.team_b_logo_url} alt="Team B logo" className="h-10 mt-2 rounded-lg object-cover" />
                )}
              </div>
            </div>
            <input
              type="text"
              placeholder="Venue"
              value={matchForm.venue}
              onChange={(e) => setMatchForm({ ...matchForm, venue: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#1A253F] border border-[#28396C] rounded-xl text-white"
            />
            <input
              type="number"
              min="1"
              max="50"
              placeholder="Total Overs"
              value={matchForm.total_overs}
              onChange={(e) => {
                const val = e.target.value === "" ? 20 : parseInt(e.target.value, 10);
                setMatchForm({ ...matchForm, total_overs: val });
              }}
              className="w-full px-4 py-2.5 bg-[#1A253F] border border-[#28396C] rounded-xl text-white"
            />
            <input
              type="datetime-local"
              value={matchForm.match_date}
              onChange={(e) => setMatchForm({ ...matchForm, match_date: e.target.value })}
              min={minDate}
              max={maxDate}
              className="w-full px-4 py-2.5 bg-[#1A253F] border border-[#28396C] rounded-xl text-white"
            />
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-[#B5E18B] text-[#1F2A44] font-black uppercase tracking-wider rounded-xl hover:bg-[#c8f0a2] transition disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Match"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateMatch(false)}
                className="px-6 py-2.5 bg-transparent border border-[#28396C] text-[#a8dadc] font-black uppercase tracking-wider rounded-xl hover:bg-white/5 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="bg-[#111520]/80 rounded-2xl p-8 text-center">
          <div className="text-[#a8dadc]">Loading matches...</div>
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-[#111520]/60 rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-[#a8dadc]/60">No matches added yet. Click "+ Add Match" to schedule one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {matches.map((m) => (
            <div
              key={m.id}
              className="bg-[#111520]/80 backdrop-blur-xl rounded-2xl border border-white/5 hover:border-[#3b6fd4]/30 transition-all p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Link href={`/match/${m.id}`} className="flex items-center gap-6 flex-wrap flex-1">
                  <div className="flex items-center gap-3">
                    {m.team_a_logo_url ? (
                      <img src={m.team_a_logo_url} alt={m.team_a_name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#1A253F] flex items-center justify-center font-bold text-white">
                        {m.team_a_name[0]}
                      </div>
                    )}
                    <span className="font-bold text-white">{m.team_a_name}</span>
                  </div>
                  <span className="text-[#B5E18B] font-black text-lg">VS</span>
                  <div className="flex items-center gap-3">
                    {m.team_b_logo_url ? (
                      <img src={m.team_b_logo_url} alt={m.team_b_name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#1A253F] flex items-center justify-center font-bold text-white">
                        {m.team_b_name[0]}
                      </div>
                    )}
                    <span className="font-bold text-white">{m.team_b_name}</span>
                  </div>
                </Link>
                <div className="flex flex-wrap items-center gap-4 text-sm text-[#a8dadc]/70">
                  {m.venue && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {m.venue}
                    </span>
                  )}
                  {m.match_date && (
                    <span className="flex items-center gap-1">
                      📅 {new Date(m.match_date).toLocaleString()}
                    </span>
                  )}
                  <span className="text-[#B5E18B] font-bold">{m.total_overs} overs</span>
                </div>
                <button onClick={() => handleDeleteMatch(m.id)} className="text-red-400 hover:text-red-300 text-sm font-bold">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}