// app/tournament/[id]/page.tsx
import { Suspense } from "react";
import TournamentDetailClient from "./TournamentDetailClient";
import { query } from "@/app/lib/db";

async function getTournament(id: number) {
  const res = await query("SELECT name, description, venue FROM tournaments WHERE id = $1", [id]);
  return res.rows[0];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const id = parseInt(resolved.id, 10);
  const tournament = await getTournament(id);
  if (!tournament) return { title: "Tournament Not Found" };
  return {
    title: `${tournament.name} – Cricket Tournament | Scory`,
    description: tournament.description || `Full schedule, live scores, and results for the ${tournament.name} cricket tournament at ${tournament.venue || "various venues"}.`,
    openGraph: {
      title: `${tournament.name} – Tournament Hub`,
      description: tournament.description || "View all matches, points table, and tournament stats.",
    },
  };
}

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const id = parseInt(resolved.id, 10);
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading tournament...</div>}>
      <TournamentDetailClient tournamentId={id} />
    </Suspense>
  );
}