import { query } from "@/app/lib/db";

export const dynamic = 'force-dynamic';  

interface MatchRow {
  id: number;
  updated_at: string | null;
}

interface TournamentRow {
  id: number;
  updated_at: string | null;
}

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const matches = await query(
    "SELECT id, updated_at FROM matches WHERE status != 'scheduled'"
  );
  const tournaments = await query("SELECT id, updated_at FROM tournaments");

  const matchUrls = (matches.rows as MatchRow[]).map((match) => ({
    url: `${baseUrl}/match/${match.id}`,
    lastModified: match.updated_at ? new Date(match.updated_at) : new Date(),
    changeFrequency: "hourly" as const,
    priority: 0.8,
  }));

  const tournamentUrls = (tournaments.rows as TournamentRow[]).map((tournament) => ({
    url: `${baseUrl}/tournament/${tournament.id}`,
    lastModified: tournament.updated_at ? new Date(tournament.updated_at) : new Date(),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/live`,
      lastModified: new Date(),
      changeFrequency: "always" as const,
      priority: 0.9,
    },
    ...matchUrls,
    ...tournamentUrls,
  ];
}