"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "tournaments">("profile");
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [viewMatches, setViewMatches] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  if (status === "loading")
    return (
      <div className="min-h-screen bg-[#080C10] flex items-center justify-center">
        <div className="text-[#B5E18B] text-xl">Loading...</div>
      </div>
    );
  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#080C10] py-8">
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-3xl font-['Barlow_Condensed'] font-bold text-[#F0F0F0] uppercase tracking-wide mb-6">Dashboard</h1>

        <div className="flex gap-4 border-b border-[#28396C] mb-6">
          <button
            onClick={() => {
              setActiveTab("profile");
              setViewMatches(false);
              setSelectedTournament(null);
            }}
            className={`pb-2 px-1 font-['Barlow_Condensed'] font-bold uppercase tracking-wide transition ${activeTab === "profile" ? "text-[#B5E18B] border-b-2 border-[#B5E18B]" : "text-gray-400 hover:text-white"}`}
          >
            My Profile
          </button>
          <button
            onClick={() => {
              setActiveTab("tournaments");
              setViewMatches(false);
              setSelectedTournament(null);
            }}
            className={`pb-2 px-1 font-['Barlow_Condensed'] font-bold uppercase tracking-wide transition ${activeTab === "tournaments" ? "text-[#B5E18B] border-b-2 border-[#B5E18B]" : "text-gray-400 hover:text-white"}`}
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
    const res = await fetch("/api/user/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: user.name, mobile: user.mobile }) });
    setMessage(res.ok ? "Profile updated!" : "Failed to update.");
    setUpdating(false);
  };

  if (loading) return <div className="text-white">Loading...</div>;
  return (
    <div className="bg-[#0B1322] border border-[#28396C] rounded-lg p-6">
      <h2 className="text-xl font-['Barlow_Condensed'] font-bold text-[#F0F0F0] mb-4">Edit Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[#A0A8B4] mb-1">Name</label>
          <input type="text" value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} required className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white focus:border-[#B5E18B]" />
        </div>
        <div>
          <label className="block text-sm text-[#A0A8B4] mb-1">Email</label>
          <input type="email" value={user.email} disabled className="w-full px-4 py-2 bg-[#1A253F]/50 border border-[#28396C] rounded text-gray-400 cursor-not-allowed" />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>
        <div>
          <label className="block text-sm text-[#A0A8B4] mb-1">Mobile</label>
          <input type="tel" value={user.mobile || ""} onChange={(e) => setUser({ ...user, mobile: e.target.value })} className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white focus:border-[#B5E18B]" />
        </div>
        {message && <div className={`text-sm ${message.includes("success") ? "text-green-400" : "text-red-400"}`}>{message}</div>}
        <button type="submit" disabled={updating} className="px-6 py-2 bg-[#B5E18B] text-[#1F2A44] font-bold uppercase tracking-wide rounded hover:bg-[#c8f0a2] disabled:opacity-50">
          {updating ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

function TournamentsSection({ onManageMatches }: { onManageMatches: (tournament: any) => void }) {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", venue: "", start_date: "", end_date: "", logo_url: "", description: "" });
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
    setSubmitting(true);
    const payload = { ...formData, start_date: formData.start_date || null, end_date: formData.end_date || null };
    const url = editingTournament ? `/api/tournaments?id=${editingTournament.id}` : "/api/tournaments";
    const method = editingTournament ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      setFormData({ name: "", venue: "", start_date: "", end_date: "", logo_url: "", description: "" });
      setShowCreateForm(false);
      setEditingTournament(null);
      fetchTournaments();
    } else alert("Failed to save tournament");
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
    setFormData({ name: t.name, venue: t.venue || "", start_date: t.start_date?.split("T")[0] || "", end_date: t.end_date?.split("T")[0] || "", logo_url: t.logo_url || "", description: t.description || "" });
    setShowCreateForm(true);
  };

  if (loading) return <div className="text-white">Loading tournaments...</div>;

  return (
    <div className="space-y-6">
      <button
        onClick={() => {
          setEditingTournament(null);
          setFormData({ name: "", venue: "", start_date: "", end_date: "", logo_url: "", description: "" });
          setShowCreateForm(!showCreateForm);
        }}
        className="px-4 py-2 bg-[#B5E18B] text-[#1F2A44] font-bold uppercase tracking-wide rounded hover:bg-[#c8f0a2]"
      >
        {showCreateForm ? "Cancel" : "+ Create Tournament"}
      </button>

      {showCreateForm && (
        <div className="bg-[#0B1322] border border-[#28396C] rounded-lg p-6">
          <h3 className="text-lg font-['Barlow_Condensed'] font-bold text-[#F0F0F0] mb-4">{editingTournament ? "Edit Tournament" : "New Tournament"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" placeholder="Tournament Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white" />
            <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white" />
            <input type="text" placeholder="Venue" value={formData.venue} onChange={(e) => setFormData({ ...formData, venue: e.target.value })} className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white" />
            <div className="grid grid-cols-2 gap-4">
              <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white" />
              <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white" />
            </div>
            <div>
              <label className="block text-sm text-[#A0A8B4] mb-1">Tournament Logo</label>
              <input type="file" accept="image/*" onChange={handleFileChange} className="text-white" />
              {uploading && <span className="ml-2 text-sm text-[#B5E18B]">Uploading...</span>}
              {formData.logo_url && <img src={formData.logo_url} alt="logo" className="h-10 mt-2 rounded" />}
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#B5E18B] text-[#1F2A44] font-bold rounded">
                {submitting ? "Saving..." : editingTournament ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingTournament(null);
                }}
                className="px-4 py-2 bg-transparent border border-[#28396C] text-[#A0A8B4] rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {tournaments.length === 0 ? (
        <div className="bg-[#0B1322] border border-[#28396C] rounded-lg p-6 text-center text-gray-400">No tournaments yet.</div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => (
            <div key={t.id} className="bg-[#0B1322] border border-[#28396C] rounded-lg p-4 hover:border-[#B5E18B]/30">
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {t.logo_url && <img src={t.logo_url} alt={t.name} className="w-8 h-8 rounded-full object-cover" />}
                    <h3 className="text-lg font-bold text-[#F0F0F0]">{t.name}</h3>
                    <span className="text-xs px-2 py-1 rounded bg-[#1A253F] text-[#B5E18B] uppercase">{t.status}</span>
                  </div>
                  {t.description && <p className="text-sm text-[#A0A8B4] mt-1">{t.description}</p>}
                  {t.venue && <p className="text-sm text-[#A0A8B4]">📍 {t.venue}</p>}
                  {(t.start_date || t.end_date) && (
                    <p className="text-sm text-[#A0A8B4]">
                      📅 {t.start_date} {t.end_date && `→ ${t.end_date}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(t)} className="px-3 py-1 text-xs bg-[#28396C] text-white rounded hover:bg-[#3F5F9E]">
                    Edit
                  </button>
                  <button onClick={() => onManageMatches(t)} className="px-3 py-1 text-xs bg-[#B5E18B] text-[#1F2A44] font-bold rounded hover:bg-[#c8f0a2]">
                    Manage Matches
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="px-3 py-1 text-xs bg-red-600/70 text-white rounded hover:bg-red-600">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchesManager({ tournament, onBack }: { tournament: any; onBack: () => void }) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [matchForm, setMatchForm] = useState({ team_a_name: "", team_a_logo_url: "", team_b_name: "", team_b_logo_url: "", venue: "", match_date: "", total_overs: 20 });
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
    setSubmitting(true);
    const payload = { tournament_id: tournament.id, ...matchForm, match_date: matchForm.match_date || null, total_overs: matchForm.total_overs };
    const res = await fetch("/api/matches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      setMatchForm({ team_a_name: "", team_a_logo_url: "", team_b_name: "", team_b_logo_url: "", venue: "", match_date: "", total_overs: 20 });
      setShowCreateMatch(false);
      fetchMatches();
    } else alert("Failed to create match");
    setSubmitting(false);
  };

  const handleDeleteMatch = async (matchId: number) => {
    if (!confirm("Delete this match?")) return;
    const res = await fetch(`/api/matches?id=${matchId}`, { method: "DELETE" });
    if (res.ok) fetchMatches();
    else alert("Delete failed");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="text-[#B5E18B] hover:underline">
          ← Back to Tournaments
        </button>
        <button onClick={() => setShowCreateMatch(!showCreateMatch)} className="px-4 py-2 bg-[#B5E18B] text-[#1F2A44] font-bold rounded">
          {showCreateMatch ? "Cancel" : "+ Add Match"}
        </button>
      </div>
      <h2 className="text-2xl font-['Barlow_Condensed'] font-bold text-[#F0F0F0]">{tournament.name} - Matches</h2>

      {showCreateMatch && (
        <div className="bg-[#0B1322] border border-[#28396C] rounded-lg p-6">
          <h3 className="text-lg font-bold text-[#F0F0F0] mb-4">Add New Match</h3>
          <form onSubmit={handleCreateMatch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#A0A8B4] mb-1">Team A Name *</label>
                <input type="text" value={matchForm.team_a_name} onChange={(e) => setMatchForm({ ...matchForm, team_a_name: e.target.value })} required className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white" />
                <label className="block text-sm text-[#A0A8B4] mt-2">Team A Logo</label>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "A")} className="text-white text-sm" />
                {uploadingTeamA && <span className="text-xs text-[#B5E18B]">Uploading...</span>}
                {matchForm.team_a_logo_url && <img src={matchForm.team_a_logo_url} alt="Team A logo" className="h-8 mt-2 rounded" />}
              </div>
              <div>
                <label className="block text-sm text-[#A0A8B4] mb-1">Team B Name *</label>
                <input type="text" value={matchForm.team_b_name} onChange={(e) => setMatchForm({ ...matchForm, team_b_name: e.target.value })} required className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white" />
                <label className="block text-sm text-[#A0A8B4] mt-2">Team B Logo</label>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "B")} className="text-white text-sm" />
                {uploadingTeamB && <span className="text-xs text-[#B5E18B]">Uploading...</span>}
                {matchForm.team_b_logo_url && <img src={matchForm.team_b_logo_url} alt="Team B logo" className="h-8 mt-2 rounded" />}
              </div>
            </div>
            <input type="text" placeholder="Venue" value={matchForm.venue} onChange={(e) => setMatchForm({ ...matchForm, venue: e.target.value })} className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white" />
            <input type="number" min="1" max="50" placeholder="Total Overs" value={matchForm.total_overs} onChange={(e) => setMatchForm({ ...matchForm, total_overs: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white" />
            <input type="datetime-local" value={matchForm.match_date} onChange={(e) => setMatchForm({ ...matchForm, match_date: e.target.value })} className="w-full px-4 py-2 bg-[#1A253F] border border-[#28396C] rounded text-white" />
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#B5E18B] text-[#1F2A44] font-bold rounded">
              {submitting ? "Creating..." : "Create Match"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-white">Loading matches...</div>
      ) : matches.length === 0 ? (
        <div className="bg-[#0B1322] border border-[#28396C] rounded-lg p-6 text-center text-gray-400">No matches added yet.</div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <div key={m.id} className="bg-[#0B1322] border border-[#28396C] rounded-lg p-4 hover:bg-[#1A253F]/50 transition">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <Link href={`/match/${m.id}`} className="flex items-center gap-4 flex-wrap flex-1">
                  <div className="flex items-center gap-2">
                    {m.team_a_logo_url && <img src={m.team_a_logo_url} alt={m.team_a_name} className="w-8 h-8 rounded-full object-cover" />}
                    <span className="font-bold text-white">{m.team_a_name}</span>
                  </div>
                  <span className="text-[#B5E18B] font-bold">vs</span>
                  <div className="flex items-center gap-2">
                    {m.team_b_logo_url && <img src={m.team_b_logo_url} alt={m.team_b_name} className="w-8 h-8 rounded-full object-cover" />}
                    <span className="font-bold text-white">{m.team_b_name}</span>
                  </div>
                </Link>
                <div className="text-sm text-[#A0A8B4]">
                  {m.venue && <span>📍 {m.venue} </span>}
                  {m.match_date && <span>📅 {new Date(m.match_date).toLocaleString()}</span>}
                  <span className="ml-2 text-[#B5E18B]">{m.total_overs} overs</span>
                </div>
                <button onClick={() => handleDeleteMatch(m.id)} className="text-red-400 hover:text-red-300 text-sm">
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
