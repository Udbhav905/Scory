import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/app/lib/db";
interface InningsRow {
  id: number;
}

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

// PUT – update match status
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, status } = await request.json();
  if (!id || !status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const userId = await getUserId(session);
  
  // Verify ownership via match -> tournament -> user
  const verify = await query(
    `SELECT m.id FROM matches m
     JOIN tournaments t ON m.tournament_id = t.id
     WHERE m.id = $1 AND t.user_id = $2`,
    [id, userId]
  );
  if (verify.rows.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await query("UPDATE matches SET status = $1 WHERE id = $2", [status, id]);
  return NextResponse.json({ message: "Match status updated" });
}

// DELETE – delete a match
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const userId = await getUserId(session);
  
  // Verify ownership
  const verify = await query(
    `SELECT m.id FROM matches m
     JOIN tournaments t ON m.tournament_id = t.id
     WHERE m.id = $1 AND t.user_id = $2`,
    [id, userId]
  );
  if (verify.rows.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Delete dependent ball events, innings, then the match
  // 1. Get innings IDs for the match
  const inningsRes = await query("SELECT id FROM innings WHERE match_id = $1", [id]);

const inningsIds = inningsRes.rows.map((row: InningsRow) => row.id);
  if (inningsIds.length > 0) {
    // Delete ball events for these innings
    await query("DELETE FROM ball_events WHERE innings_id = ANY($1)", [inningsIds]);
    // Delete the innings themselves
    await query("DELETE FROM innings WHERE id = ANY($1)", [inningsIds]);
  }

  // Finally, delete the match
  await query("DELETE FROM matches WHERE id = $1", [id]);
  return NextResponse.json({ message: "Match deleted" });
}

async function getUserId(session: any) {
  const userRes = await query("SELECT id FROM users WHERE email = $1", [session.user.email]);
  return userRes.rows[0]?.id;
}