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

  const toss = await query("SELECT * FROM toss WHERE match_id = $1", [matchId]);
  return NextResponse.json(toss.rows[0] || null);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { match_id, winner_team, decision } = await request.json();
  if (!match_id || !winner_team || !decision) {
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

  // Upsert: delete previous if any
  await query("DELETE FROM toss WHERE match_id = $1", [match_id]);
  await query(
    "INSERT INTO toss (match_id, winner_team, decision) VALUES ($1, $2, $3)",
    [match_id, winner_team, decision]
  );
  // Also update match status to 'toss_done' if needed
  await query("UPDATE matches SET status = 'toss_done' WHERE id = $1", [match_id]);

  return NextResponse.json({ message: "Toss recorded" });
}