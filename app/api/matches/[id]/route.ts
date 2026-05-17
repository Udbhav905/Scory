import { NextResponse } from "next/server";
import { query } from "@/app/lib/db";
import { auth } from "@/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params;
  if (!matchId) {
    return NextResponse.json({ error: "Match ID required" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const isFull = searchParams.get("full") === "true";

  // Get the current session (optional)
  const session = await auth();
  let userId = null;
  if (session?.user?.email) {
    const userRes = await query("SELECT id FROM users WHERE email = $1", [session.user.email]);
    userId = userRes.rows[0]?.id;
  }

  try {
    const result = await query(
      `SELECT m.id, m.team_a_name, m.team_a_logo_url, m.team_b_name, m.team_b_logo_url,
              m.venue, m.match_date, m.total_overs, m.status, t.user_id as tournament_owner_id
       FROM matches m
       LEFT JOIN tournaments t ON m.tournament_id = t.id
       WHERE m.id = $1`,
      [matchId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const match = result.rows[0];
    // Determine if current user is the tournament owner
    const isOwner = userId ? match.tournament_owner_id === userId : false;

    // Remove internal fields before sending
    delete match.tournament_owner_id;

    if (isFull) {
      // Fetch players, innings, and ball events in parallel on the server
      const [playersRes, inningsRes] = await Promise.all([
        query("SELECT * FROM players WHERE match_id = $1", [matchId]),
        query("SELECT * FROM innings WHERE match_id = $1 ORDER BY innings_number ASC", [matchId]),
      ]);

      let ballEvents: any[] = [];
      if (inningsRes.rows.length > 0) {
        const inningsIds = inningsRes.rows.map((inn: any) => inn.id);
        const ballsRes = await query(
          "SELECT * FROM ball_events WHERE innings_id = ANY($1) ORDER BY over_number, ball_number",
          [inningsIds]
        );
        ballEvents = ballsRes.rows;
      }

      return NextResponse.json({
        ...match,
        isOwner,
        players: playersRes.rows,
        innings: inningsRes.rows,
        ballEvents,
      });
    }

    return NextResponse.json({ ...match, isOwner });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}