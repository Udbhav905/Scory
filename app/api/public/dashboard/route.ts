import { NextResponse } from "next/server";
import { query } from "@/app/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get("query") || "";

  try {
    // 1. Live matches (statuses that indicate an ongoing match)
    const liveMatches = await query(
      `SELECT m.*, t.name as tournament_name 
       FROM matches m 
       LEFT JOIN tournaments t ON m.tournament_id = t.id
       WHERE m.status IN ('live', 'toss_done', 'innings_1_complete', 'innings_2_live')
       AND (m.team_a_name ILIKE $1 OR m.team_b_name ILIKE $1 OR t.name ILIKE $1 OR m.venue ILIKE $1)
       ORDER BY m.match_date DESC`,
      [`%${searchTerm}%`]
    );

    // 2. Completed matches (status = 'completed')
    const recentMatches = await query(
      `SELECT m.*, t.name as tournament_name 
       FROM matches m 
       LEFT JOIN tournaments t ON m.tournament_id = t.id
       WHERE m.status = 'completed'
       AND (m.team_a_name ILIKE $1 OR m.team_b_name ILIKE $1 OR t.name ILIKE $1 OR m.venue ILIKE $1)
       ORDER BY m.match_date DESC LIMIT 10`,
      [`%${searchTerm}%`]
    );

    // 3. **ALL tournaments** – removed the status filter
    const tournaments = await query(
      `SELECT * FROM tournaments 
       WHERE (name ILIKE $1 OR venue ILIKE $1)
       ORDER BY created_at DESC`,
      [`%${searchTerm}%`]
    );

    return NextResponse.json({
      liveMatches: liveMatches.rows,
      recentMatches: recentMatches.rows,
      tournaments: tournaments.rows,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}