import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/app/lib/db";

// Helper to get user id from session
async function getUserId(session: any) {
  const userRes = await query("SELECT id FROM users WHERE email = $1", [session.user.email]);
  return userRes.rows[0]?.id;
}

// GET - fetch user's tournaments
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const tournaments = await query(
    `SELECT id, name, venue, start_date, end_date, status, created_at, logo_url, description 
     FROM tournaments WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return NextResponse.json(tournaments.rows);
}

// POST - create tournament
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { name, venue, start_date, end_date, logo_url, description } = await request.json();
  if (!name) return NextResponse.json({ error: "Tournament name required" }, { status: 400 });

  const result = await query(
    `INSERT INTO tournaments (user_id, name, venue, start_date, end_date, logo_url, description, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft') RETURNING id`,
    [userId, name, venue || null, start_date || null, end_date || null, logo_url || null, description || null]
  );
  return NextResponse.json({ id: result.rows[0].id, message: "Tournament created" }, { status: 201 });
}

// PUT - update tournament
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id, name, venue, start_date, end_date, logo_url, description, status } = await request.json();
  if (!id || !name) return NextResponse.json({ error: "Tournament ID and name required" }, { status: 400 });

  // Ensure tournament belongs to user
  const ownerCheck = await query("SELECT id FROM tournaments WHERE id = $1 AND user_id = $2", [id, userId]);
  if (ownerCheck.rows.length === 0) return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });

  await query(
    `UPDATE tournaments SET name=$1, venue=$2, start_date=$3, end_date=$4, logo_url=$5, description=$6, status=$7
     WHERE id=$8`,
    [name, venue || null, start_date || null, end_date || null, logo_url || null, description || null, status || 'draft', id]
  );
  return NextResponse.json({ message: "Tournament updated" });
}

// DELETE - delete tournament (and cascading matches)
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = await getUserId(session);
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: "Tournament ID required" }, { status: 400 });

  const ownerCheck = await query("SELECT id FROM tournaments WHERE id = $1 AND user_id = $2", [id, userId]);
  if (ownerCheck.rows.length === 0) return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });

  await query("DELETE FROM tournaments WHERE id = $1", [id]);
  return NextResponse.json({ message: "Tournament deleted" });
}