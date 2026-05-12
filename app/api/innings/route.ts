import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/app/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session || !session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

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

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { match_id, batting_team, bowling_team } = await request.json();
  if (!match_id) return NextResponse.json({ error: "match_id required" }, { status: 400 });

  const verify = await query(
    `SELECT m.id FROM matches m
     JOIN tournaments t ON m.tournament_id = t.id
     WHERE m.id = $1 AND t.user_id = (SELECT id FROM users WHERE email = $2)`,
    [match_id, session.user.email]
  );
  if (verify.rows.length === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const innings = await query("SELECT * FROM innings WHERE match_id = $1 ORDER BY innings_number", [match_id]);
  
  if (innings.rows.length === 0) {
    if (!batting_team || !bowling_team) return NextResponse.json({ error: "Teams required" }, { status: 400 });
    await query(
      `INSERT INTO innings (match_id, innings_number, batting_team, bowling_team)
       VALUES ($1, 1, $2, $3)`,
      [match_id, batting_team, bowling_team]
    );
    await query("UPDATE matches SET status = 'live' WHERE id = $1", [match_id]);
    return NextResponse.json({ message: "First innings started" });
  }

  if (innings.rows.length === 1) {
    const firstInn = innings.rows[0];
    await query(
      `INSERT INTO innings (match_id, innings_number, batting_team, bowling_team)
       VALUES ($1, 2, $2, $3)`,
      [match_id, firstInn.bowling_team, firstInn.batting_team]
    );
    return NextResponse.json({ message: "Second innings started" });
  }

  return NextResponse.json({ error: "Match already has 2 innings" }, { status: 400 });
}