import { NextResponse } from "next/server";
import { query } from "@/app/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get("query") || "";

  try {
    // 🔥 OPTIMIZATION: Fetch live matches, recent matches, and tournaments in parallel
    const [liveMatches, recentMatches, tournaments] = await Promise.all([
      query(
        `SELECT m.*, t.name as tournament_name 
         FROM matches m 
         LEFT JOIN tournaments t ON m.tournament_id = t.id
         WHERE m.status IN ('live', 'toss_done', 'innings_1_complete', 'innings_2_live')
         AND (m.team_a_name ILIKE $1 OR m.team_b_name ILIKE $1 OR t.name ILIKE $1 OR m.venue ILIKE $1)
         ORDER BY m.match_date DESC LIMIT 10`,
        [`%${searchTerm}%`]
      ),
      query(
        `SELECT m.*, t.name as tournament_name 
         FROM matches m 
         LEFT JOIN tournaments t ON m.tournament_id = t.id
         WHERE m.status = 'completed'
         AND (m.team_a_name ILIKE $1 OR m.team_b_name ILIKE $1 OR t.name ILIKE $1 OR m.venue ILIKE $1)
         ORDER BY m.match_date DESC LIMIT 10`,
        [`%${searchTerm}%`]
      ),
      query(
        `SELECT * FROM tournaments 
         WHERE (name ILIKE $1 OR venue ILIKE $1)
         ORDER BY created_at DESC LIMIT 10`,
        [`%${searchTerm}%`]
      )
    ]);

    // Fetch innings for matches in parallel to avoid N+1 requests from the client
    const matchIds = [...liveMatches.rows, ...recentMatches.rows].map(m => m.id);
    const inningsMap: Record<number, any[]> = {};
    if (matchIds.length > 0) {
      const inningsRes = await query(
        `SELECT id, match_id, innings_number, batting_team, bowling_team, total_runs, total_wickets, overs 
         FROM innings 
         WHERE match_id = ANY($1) 
         ORDER BY innings_number ASC`,
        [matchIds]
      );
      inningsRes.rows.forEach((row: any) => {
        const mId = row.match_id;
        if (!inningsMap[mId]) {
          inningsMap[mId] = [];
        }
        inningsMap[mId].push(row);
      });
    }

    const liveMatchesWithInnings = liveMatches.rows.map((m: any) => ({
      ...m,
      innings: inningsMap[m.id] || []
    }));

    const recentMatchesWithInnings = recentMatches.rows.map((m: any) => ({
      ...m,
      innings: inningsMap[m.id] || []
    }));

    return NextResponse.json({
      liveMatches: liveMatchesWithInnings,
      recentMatches: recentMatchesWithInnings,
      tournaments: tournaments.rows,
    });
  } catch (err) {
    console.log("DB URL : ", process.env.DATABASE_URL);
    console.error("DB ERROR:", err);

    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}