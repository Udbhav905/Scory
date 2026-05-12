import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/app/lib/db";

// Helper to update innings totals
// async function updateInningsTotals(inningsId: number) {
//   const result = await query(
//     `SELECT SUM(runs + extra_runs) as total_runs, COUNT(CASE WHEN is_wicket THEN 1 END) as total_wickets,
//             MAX(over_number) + (SELECT MAX(ball_number)/6.0 ... ) -- simplified: we'll compute overs separately
//      FROM ball_events WHERE innings_id = $1`,
//     [inningsId],
//   );
//   // For simplicity, we'll recalculate runs/wickets from ball_events
//   const runsRes = await query(
//     `SELECT COALESCE(SUM(runs + extra_runs), 0) as runs,
//             COALESCE(SUM(CASE WHEN is_wicket THEN 1 ELSE 0 END), 0) as wickets
//      FROM ball_events WHERE innings_id = $1`,
//     [inningsId],
//   );
//   //   const oversRes = await query(
//   //     `SELECT COUNT(DISTINCT over_number) - 1 + (MAX(ball_number)/6.0) as overs
//   //      FROM ball_events WHERE innings_id = $1`,
//   //     [inningsId]
//   //   );
//   const oversRes = await query(
//     `SELECT COALESCE(CAST(COUNT(DISTINCT over_number) - 1 + (MAX(ball_number)/6.0) AS DECIMAL(5,2)), 0) as overs
//    FROM ball_events WHERE innings_id = $1`,
//     [inningsId],
//   );
//   const overs = parseFloat(oversRes.rows[0].overs);
//   const runs = runsRes.rows[0].runs;
//   const wickets = runsRes.rows[0].wickets;
//   //   const overs = oversRes.rows[0].overs || 0;
//   await query(`UPDATE innings SET total_runs = $1, total_wickets = $2, overs = $3 WHERE id = $4`, [runs, wickets, overs, inningsId]);
// }
async function updateInningsTotals(inningsId: number) {
  // Calculate runs and wickets
  const runsRes = await query(
    `SELECT COALESCE(SUM(runs + extra_runs), 0) as runs,
            COALESCE(SUM(CASE WHEN is_wicket THEN 1 ELSE 0 END), 0) as wickets
     FROM ball_events WHERE innings_id = $1`,
    [inningsId]
  );
  // Calculate overs: (max over number - 1) + (max ball number / 6)
  const oversRes = await query(
    `SELECT 
       COALESCE(
         MAX(over_number) - 1 + (MAX(ball_number)::numeric / 6),
         0
       ) as overs
     FROM ball_events WHERE innings_id = $1`,
    [inningsId]
  );
  const runs = runsRes.rows[0].runs;
  const wickets = runsRes.rows[0].wickets;
  const overs = parseFloat(oversRes.rows[0].overs) || 0;
  await query(
    `UPDATE innings SET total_runs = $1, total_wickets = $2, overs = $3 WHERE id = $4`,
    [runs, wickets, overs, inningsId]
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { innings_id, over_number, ball_number, batsman_id, bowler_id, runs, is_wicket, wicket_type, extra_type, extra_runs } = await request.json();
  if (!innings_id || over_number === undefined || ball_number === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }
  // Verify ownership through innings->match->tournament->user
  const verify = await query(
    `SELECT i.id FROM innings i
     JOIN matches m ON i.match_id = m.id
     JOIN tournaments t ON m.tournament_id = t.id
     WHERE i.id = $1 AND t.user_id = (SELECT id FROM users WHERE email = $2)`,
    [innings_id, session.user.email],
  );
  if (verify.rows.length === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await query(
    `INSERT INTO ball_events (innings_id, over_number, ball_number, batsman_id, bowler_id, runs, is_wicket, wicket_type, extra_type, extra_runs)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [innings_id, over_number, ball_number, batsman_id || null, bowler_id || null, runs || 0, is_wicket || false, wicket_type || null, extra_type || null, extra_runs || 0],
  );
  await updateInningsTotals(innings_id);
  return NextResponse.json({ message: "Ball recorded" });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const inningsId = searchParams.get("inningsId");
  if (!inningsId) return NextResponse.json({ error: "inningsId required" }, { status: 400 });
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }
  const verify = await query(
    `SELECT i.id FROM innings i
     JOIN matches m ON i.match_id = m.id
     JOIN tournaments t ON m.tournament_id = t.id
     WHERE i.id = $1 AND t.user_id = (SELECT id FROM users WHERE email = $2)`,
    [inningsId, session.user.email],
  );
  if (verify.rows.length === 0) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const balls = await query("SELECT * FROM ball_events WHERE innings_id = $1 ORDER BY over_number, ball_number", [inningsId]);
  return NextResponse.json(balls.rows);
}
