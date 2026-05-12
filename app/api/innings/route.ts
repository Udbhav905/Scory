import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/app/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }
  const verify = await query(
    `SELECT m.id FROM matches m
     JOIN tournaments t ON m.tournament_id = t.id
     WHERE m.id = $1 AND t.user_id = (SELECT id FROM users WHERE email = $2)`,
    [matchId, session.user.email]
  );
  if (verify.rows.length === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const innings = await query("SELECT * FROM innings WHERE match_id = $1 ORDER BY innings_number", [matchId]);
  return NextResponse.json(innings.rows);
}

// POST to create first innings (after toss)
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { match_id, batting_team, bowling_team } = await request.json();
  if (!match_id || !batting_team || !bowling_team) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }
  const verify = await query(
    `SELECT m.id FROM matches m
     JOIN tournaments t ON m.tournament_id = t.id
     WHERE m.id = $1 AND t.user_id = (SELECT id FROM users WHERE email = $2)`,
    [match_id, session.user.email]
  );
  if (verify.rows.length === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  // Check if innings already exists
  const existing = await query("SELECT id FROM innings WHERE match_id = $1 AND innings_number = 1", [match_id]);
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "First innings already created" }, { status: 400 });
  }

  await query(
    `INSERT INTO innings (match_id, innings_number, batting_team, bowling_team)
     VALUES ($1, 1, $2, $3)`,
    [match_id, batting_team, bowling_team]
  );
  // Update match status to 'live'
  await query("UPDATE matches SET status = 'live' WHERE id = $1", [match_id]);

  return NextResponse.json({ message: "First innings started" });
}