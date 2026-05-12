import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/app/lib/db";

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const inningsId = searchParams.get("inningsId");
  const matchId = searchParams.get("matchId");

  if (!inningsId && !matchId) {
    return NextResponse.json({ error: "Need inningsId or matchId" }, { status: 400 });
  }

  // Verify ownership
  let verifyCondition = "";
  let params: any[] = [];
  if (inningsId) {
    verifyCondition = `
      SELECT i.id FROM innings i
      JOIN matches m ON i.match_id = m.id
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE i.id = $1 AND t.user_id = (SELECT id FROM users WHERE email = $2)
    `;
    params = [inningsId, session.user.email];
  } else {
    verifyCondition = `
      SELECT m.id FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = $1 AND t.user_id = (SELECT id FROM users WHERE email = $2)
    `;
    params = [matchId, session.user.email];
  }
  const verify = await query(verifyCondition, params);
  if (verify.rows.length === 0) {
    return NextResponse.json({ error: "Unauthorized or not found" }, { status: 403 });
  }

  if (inningsId) {
    // Reset only this innings
    await query("DELETE FROM ball_events WHERE innings_id = $1", [inningsId]);
    await query(
      "UPDATE innings SET total_runs = 0, total_wickets = 0, overs = 0 WHERE id = $1",
      [inningsId]
    );
    await query(
      "UPDATE matches SET status = 'live' WHERE id = (SELECT match_id FROM innings WHERE id = $1)",
      [inningsId]
    );
  } else if (matchId) {
    // Full match reset
    await query("DELETE FROM ball_events WHERE innings_id IN (SELECT id FROM innings WHERE match_id = $1)", [matchId]);
    await query("DELETE FROM innings WHERE match_id = $1", [matchId]);
    await query("DELETE FROM toss WHERE match_id = $1", [matchId]);
    await query("UPDATE matches SET status = 'scheduled' WHERE id = $1", [matchId]);
  }

  return NextResponse.json({ message: "Reset successful" });
}