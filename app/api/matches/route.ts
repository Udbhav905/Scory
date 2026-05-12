import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/app/lib/db";

// GET matches for a tournament
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get("tournamentId");
  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId required" }, { status: 400 });
  }

  const userId = await getUserId(session);
  const verify = await query(
    "SELECT id FROM tournaments WHERE id = $1 AND user_id = $2",
    [tournamentId, userId]
  );
  if (verify.rows.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const matches = await query(
    `SELECT id, team_a_name, team_a_logo_url, team_b_name, team_b_logo_url, 
            venue, match_date, total_overs, status
     FROM matches WHERE tournament_id = $1 ORDER BY match_date ASC`,
    [tournamentId]
  );
  return NextResponse.json(matches.rows);
}

// POST – create a new match
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tournament_id, team_a_name, team_a_logo_url, team_b_name, team_b_logo_url, venue, match_date, total_overs } = await request.json();

  if (!tournament_id || !team_a_name || !team_b_name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const userId = await getUserId(session);
  const verify = await query(
    "SELECT id FROM tournaments WHERE id = $1 AND user_id = $2",
    [tournament_id, userId]
  );
  if (verify.rows.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const result = await query(
    `INSERT INTO matches (tournament_id, team_a_name, team_a_logo_url, team_b_name, team_b_logo_url, venue, match_date, total_overs, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled')
     RETURNING id`,
    [tournament_id, team_a_name, team_a_logo_url || null, team_b_name, team_b_logo_url || null, venue || null, match_date || null, total_overs || 20]
  );
  return NextResponse.json({ id: result.rows[0].id, message: "Match created" }, { status: 201 });
}

async function getUserId(session: any) {
  const userRes = await query("SELECT id FROM users WHERE email = $1", [session.user.email]);
  return userRes.rows[0]?.id;
}