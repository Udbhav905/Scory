import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/app/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

  // Verify user owns the tournament of this match
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const verify = await query(
    `SELECT m.id FROM matches m
   JOIN tournaments t ON m.tournament_id = t.id
   WHERE m.id = $1 AND t.user_id = (
     SELECT id FROM users WHERE email = $2
   )`,
    [matchId, session.user.email],
  );
  if (verify.rows.length === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const players = await query("SELECT * FROM players WHERE match_id = $1", [matchId]);
  return NextResponse.json(players.rows);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { match_id, name, team, role, batting_style, bowling_style, is_captain, is_wicketkeeper } = await request.json();
  if (!match_id || !name || !team || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }
  // Verify ownership
  const verify = await query(
    `SELECT m.id FROM matches m
     JOIN tournaments t ON m.tournament_id = t.id
     WHERE m.id = $1 AND t.user_id = (SELECT id FROM users WHERE email = $2)`,
    [match_id, session.user.email],
  );
  if (verify.rows.length === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const result = await query(
    `INSERT INTO players (match_id, name, team, role, batting_style, bowling_style, is_captain, is_wicketkeeper)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [match_id, name, team, role, batting_style || null, bowling_style || null, is_captain || false, is_wicketkeeper || false],
  );
  return NextResponse.json({ id: result.rows[0].id, message: "Player added" }, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, role, batting_style, bowling_style, is_captain, is_wicketkeeper } = await request.json();
  if (!id) return NextResponse.json({ error: "Player ID required" }, { status: 400 });
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }
  // Verify ownership via match->tournament->user
  const verify = await query(
    `SELECT p.id FROM players p
     JOIN matches m ON p.match_id = m.id
     JOIN tournaments t ON m.tournament_id = t.id
     WHERE p.id = $1 AND t.user_id = (SELECT id FROM users WHERE email = $2)`,
    [id, session.user.email],
  );
  if (verify.rows.length === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await query(`UPDATE players SET name=$1, role=$2, batting_style=$3, bowling_style=$4, is_captain=$5, is_wicketkeeper=$6 WHERE id=$7`, [name, role, batting_style || null, bowling_style || null, is_captain, is_wicketkeeper, id]);
  return NextResponse.json({ message: "Player updated" });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Player ID required" }, { status: 400 });
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }
  const verify = await query(
    `SELECT p.id FROM players p
     JOIN matches m ON p.match_id = m.id
     JOIN tournaments t ON m.tournament_id = t.id
     WHERE p.id = $1 AND t.user_id = (SELECT id FROM users WHERE email = $2)`,
    [id, session.user.email],
  );
  if (verify.rows.length === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await query("DELETE FROM players WHERE id = $1", [id]);
  return NextResponse.json({ message: "Player deleted" });
}
