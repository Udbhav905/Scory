import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/app/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

  const innings = await query(
    "SELECT * FROM innings WHERE match_id = $1 ORDER BY innings_number ASC",
    [matchId]
  );
  return NextResponse.json(innings.rows);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { match_id } = await request.json();
  if (!match_id) return NextResponse.json({ error: "match_id required" }, { status: 400 });
 if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Verify user owns this match
  const verify = await query(
    `SELECT m.id FROM matches m
     JOIN tournaments t ON m.tournament_id = t.id
     WHERE m.id = $1 AND t.user_id = (SELECT id FROM users WHERE email = $2)`,
    [match_id, session.user.email]
  );
  if (verify.rows.length === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  // Get match details
  const matchResult = await query(
    "SELECT total_overs FROM matches WHERE id = $1",
    [match_id]
  );
  if (matchResult.rows.length === 0) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  const totalOversLimit = matchResult.rows[0].total_overs;

  const existingInnings = await query(
    "SELECT innings_number, batting_team, bowling_team FROM innings WHERE match_id = $1 ORDER BY innings_number",
    [match_id]
  );

  // If second innings already exists, just return success
  if (existingInnings.rows.length >= 2) {
    return NextResponse.json({ message: "Second innings already exists" }, { status: 200 });
  }

  let inningsNumber = 1;
  let battingTeam = "";
  let bowlingTeam = "";

  if (existingInnings.rows.length === 0) {
    // First innings – use toss data
    const toss = await query(
      "SELECT winner_team, decision FROM toss WHERE match_id = $1",
      [match_id]
    );
    if (toss.rows.length === 0) {
      return NextResponse.json({ error: "Toss not recorded yet." }, { status: 400 });
    }
    const { winner_team, decision } = toss.rows[0];
    if (decision === "bat") {
      battingTeam = winner_team;
      bowlingTeam = winner_team === "team_a" ? "team_b" : "team_a";
    } else {
      bowlingTeam = winner_team;
      battingTeam = winner_team === "team_a" ? "team_b" : "team_a";
    }
  } else if (existingInnings.rows.length === 1) {
    // Second innings – swap teams, but first check if first innings is completed
    const first = existingInnings.rows[0];
    if (first.innings_number !== 1) {
      return NextResponse.json({ error: "Invalid innings order" }, { status: 400 });
    }

    // 🔥 Get number of players in the batting team of first innings
    const playersCount = await query(
      "SELECT COUNT(*) as count FROM players WHERE match_id = $1 AND team = $2",
      [match_id, first.batting_team]
    );
    const totalBatsmen = parseInt(playersCount.rows[0].count, 10);
    const maxWickets = totalBatsmen - 1; // last wicket pair is not out

    const firstInningsStats = await query(
      "SELECT total_wickets, overs FROM innings WHERE innings_number = 1 AND match_id = $1",
      [match_id]
    );
    const firstInn = firstInningsStats.rows[0];

    const isWicketsExhausted = firstInn.total_wickets >= maxWickets;
    const isOversExhausted = firstInn.overs >= totalOversLimit;

    if (!isWicketsExhausted && !isOversExhausted) {
      return NextResponse.json(
        { error: `First innings not yet completed. Need ${maxWickets - firstInn.total_wickets} more wickets or ${(totalOversLimit - firstInn.overs).toFixed(1)} more overs.` },
        { status: 400 }
      );
    }

    // Swap teams for second innings
    battingTeam = first.bowling_team;
    bowlingTeam = first.batting_team;
    inningsNumber = 2;
  }

  // Insert the new innings
  const result = await query(
    `INSERT INTO innings (match_id, innings_number, batting_team, bowling_team, total_runs, total_wickets, overs)
     VALUES ($1, $2, $3, $4, 0, 0, 0) RETURNING id`,
    [match_id, inningsNumber, battingTeam, bowlingTeam]
  );

  // Update match status
  if (inningsNumber === 2) {
    await query("UPDATE matches SET status = 'live' WHERE id = $1", [match_id]);
  } else {
    await query("UPDATE matches SET status = 'innings_1_complete' WHERE id = $1", [match_id]);
  }

  return NextResponse.json(
    { id: result.rows[0].id, message: `Innings ${inningsNumber} created` },
    { status: 201 }
  );
}