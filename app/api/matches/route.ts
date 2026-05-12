import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/app/lib/db";

async function getUserId(session: any) {
  const userRes = await query("SELECT id FROM users WHERE email = $1", [session.user.email]);
  return userRes.rows[0]?.id;
}

// GET matches for a tournament
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserId(session);
  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get('tournamentId');
  if (!tournamentId) return NextResponse.json({ error: "tournamentId required" }, { status: 400 });

  // Verify tournament belongs to user
  const own = await query("SELECT id FROM tournaments WHERE id = $1 AND user_id = $2", [tournamentId, userId]);
  if (own.rows.length === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const matches = await query(
    `SELECT * FROM matches WHERE tournament_id = $1 ORDER BY match_date ASC`,
    [tournamentId]
  );
  return NextResponse.json(matches.rows);
}

// POST create new match
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserId(session);
  const { tournament_id, team_a_name, team_a_logo_url, team_b_name, team_b_logo_url, venue, match_date } = await request.json();

  if (!tournament_id || !team_a_name || !team_b_name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify ownership
  const own = await query("SELECT id FROM tournaments WHERE id = $1 AND user_id = $2", [tournament_id, userId]);
  if (own.rows.length === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const result = await query(
    `INSERT INTO matches (tournament_id, team_a_name, team_a_logo_url, team_b_name, team_b_logo_url, venue, match_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled') RETURNING id`,
    [tournament_id, team_a_name, team_a_logo_url || null, team_b_name, team_b_logo_url || null, venue || null, match_date || null]
  );
  return NextResponse.json({ id: result.rows[0].id, message: "Match created" }, { status: 201 });
}

// DELETE a match
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserId(session);
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('id');
  if (!matchId) return NextResponse.json({ error: "Match ID required" }, { status: 400 });

  // Verify match belongs to user's tournament
  const verify = await query(
    `SELECT m.id FROM matches m
     JOIN tournaments t ON m.tournament_id = t.id
     WHERE m.id = $1 AND t.user_id = $2`,
    [matchId, userId]
  );
  if (verify.rows.length === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await query("DELETE FROM matches WHERE id = $1", [matchId]);
  return NextResponse.json({ message: "Match deleted" });
}