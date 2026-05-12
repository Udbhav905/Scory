import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "../../../lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await query(
    "SELECT id, name, email, mobile FROM users WHERE email = $1",
    [session.user.email]
  );
  const user = result.rows[0];
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, mobile } = await request.json();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await query(
    "UPDATE users SET name = $1, mobile = $2 WHERE email = $3",
    [name, mobile || null, session.user.email]
  );

  return NextResponse.json({ message: "Profile updated" });
}