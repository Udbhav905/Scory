import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/app/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }   // ← note: params is Promise
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: matchId } = await params;   // ← await the promise
  if (!matchId) {
    return NextResponse.json({ error: "Match ID required" }, { status: 400 });
  }

  // Verify ownership (match belongs to user's tournament)
  const verify = await query(
    `SELECT m.id FROM matches m
     JOIN tournaments t ON m.tournament_id = t.id
     WHERE m.id = $1 AND t.user_id = (SELECT id FROM users WHERE email = $2)`,
    [matchId, session.user.email]
  );
  if (verify.rows.length === 0) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }

  const result = await query("SELECT * FROM matches WHERE id = $1", [matchId]);
  return NextResponse.json(result.rows[0]);
}