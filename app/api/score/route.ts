import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/app/lib/db";
import { pusherServer } from "@/app/lib/pusher";

async function updateInningsTotals(inningsId: number) {
  // If no balls, reset all
  const ballCount = await query("SELECT COUNT(*) as count FROM ball_events WHERE innings_id = $1", [inningsId]);
  if (ballCount.rows[0].count === 0) {
    await query("UPDATE innings SET total_runs = 0, total_wickets = 0, overs = 0 WHERE id = $1", [inningsId]);
    return;
  }

  // Total runs & wickets
  const runsRes = await query(
    `SELECT COALESCE(SUM(runs + extra_runs), 0) as runs,
            COALESCE(SUM(CASE WHEN is_wicket THEN 1 ELSE 0 END), 0) as wickets
     FROM ball_events WHERE innings_id = $1`,
    [inningsId],
  );

  // Total overs = total legal deliveries / 6
  const oversRes = await query(
    `SELECT COUNT(*) as legal_deliveries
     FROM ball_events 
     WHERE innings_id = $1 
       AND (extra_type IS NULL OR extra_type NOT IN ('wide', 'no ball'))`,
    [inningsId],
  );
  const legalDeliveries = parseInt(oversRes.rows[0].legal_deliveries, 10);
  const overs = legalDeliveries / 6; // → e.g., 5 deliveries → 0.8333

  await query(
    `UPDATE innings 
     SET total_runs = $1, total_wickets = $2, overs = $3 
     WHERE id = $4`,
    [runsRes.rows[0].runs, runsRes.rows[0].wickets, overs, inningsId],
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    innings_id,
    over_number,
    ball_number,
    batsman_id,
    bowler_id,
    runs,
    is_wicket,
    wicket_type,
    extra_type,
    extra_runs,
    dismissed_batsman_id,
    new_batsman_id, // add these
  } = await request.json();
  if (!innings_id || over_number === undefined || ball_number === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Sanitise runs – ensure non-negative numbers
  const safeRuns = Math.max(0, runs || 0);
  const safeExtraRuns = Math.max(0, extra_runs || 0);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership through innings → match → tournament → user
  const verify = await query(
    `SELECT i.id, m.id as match_id FROM innings i
     JOIN matches m ON i.match_id = m.id
     JOIN tournaments t ON m.tournament_id = t.id
     WHERE i.id = $1 AND t.user_id = (SELECT id FROM users WHERE email = $2)`,
    [innings_id, session.user.email],
  );

  if (verify.rows.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  await query(
    `INSERT INTO ball_events 
    (innings_id, over_number, ball_number, batsman_id, bowler_id, runs, is_wicket, wicket_type, extra_type, extra_runs, dismissed_batsman_id, new_batsman_id)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      innings_id,
      over_number,
      ball_number,
      batsman_id || null,
      bowler_id || null,
      safeRuns,
      is_wicket || false,
      wicket_type || null,
      extra_type || null,
      safeExtraRuns,
      dismissed_batsman_id ?? null, // add this
      new_batsman_id ?? null, // add this
    ],
  );

  await updateInningsTotals(innings_id);

  // Trigger Pusher event for real-time update
  const matchId = verify.rows[0].match_id;
  try {
    await pusherServer.trigger(`match-${matchId}`, "score-update", {
      innings_id: innings_id,
    });
  } catch (err) {
    console.error("Pusher trigger failed:", err);
  }

  // Ensure match status is 'live' if not already
  await query("UPDATE matches SET status = 'live' WHERE id = $1 AND status != 'completed'", [matchId]);

  return NextResponse.json({ message: "Ball recorded" });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inningsId = searchParams.get("inningsId");
  if (!inningsId) {
    return NextResponse.json({ error: "inningsId required" }, { status: 400 });
  }

  const balls = await query("SELECT * FROM ball_events WHERE innings_id = $1 ORDER BY over_number, ball_number", [inningsId]);

  return NextResponse.json(balls.rows);
}

// ... existing imports

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  // Convert to number
  const inningsId = Number(searchParams.get("inningsId"));

  // Validate
  if (isNaN(inningsId)) {
    return NextResponse.json({ error: "Invalid inningsId" }, { status: 400 });
  }

  // Verify ownership
  const verify = await query(
    `SELECT i.id, m.id as match_id FROM innings i
     JOIN matches m ON i.match_id = m.id
     JOIN tournaments t ON m.tournament_id = t.id
     WHERE i.id = $1 
     AND t.user_id = (
       SELECT id FROM users WHERE email = $2
     )`,
    [inningsId, session.user.email],
  );

  if (verify.rows.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Delete latest ball
  await query(
    `DELETE FROM ball_events
     WHERE id = (
       SELECT id
       FROM ball_events
       WHERE innings_id = $1
       ORDER BY over_number DESC, ball_number DESC
       LIMIT 1
     )`,
    [inningsId],
  );

  // Update totals
  await updateInningsTotals(inningsId);

  // Trigger Pusher event
  const matchId = verify.rows[0].match_id;
  try {
    await pusherServer.trigger(`match-${matchId}`, "score-update", {
      innings_id: inningsId,
    });
  } catch (err) {
    console.error("Pusher trigger failed:", err);
  }

  return NextResponse.json({
    message: "Last ball undone",
  });
}
