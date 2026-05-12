import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/app/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: matchId } = await params;
  if (!matchId) {
    return NextResponse.json({ error: "Match ID required" }, { status: 400 });
  }

  const verify = await query(
    `SELECT m.id FROM matches m
     JOIN tournaments t ON m.tournament_id = t.id
     WHERE m.id = $1 AND t.user_id = (SELECT id FROM users WHERE email = $2)`,
    [matchId, session.user.email]
  );
  if (verify.rows.length === 0) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }

  const result = await query(
    "SELECT id, team_a_name, team_a_logo_url, team_b_name, team_b_logo_url, venue, match_date, total_overs, status FROM matches WHERE id = $1",
    [matchId]
  );
  return NextResponse.json(result.rows[0]);
}