import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { query } from "../../../lib/db";

export async function POST(request: Request) {
  try {
    const { name, mobile, email, password } = await request.json();

    if (!name || !mobile || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    
    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

  
    const hashedPassword = await bcrypt.hash(password, 10);

    
    const result = await query(
      "INSERT INTO users (name, mobile, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, mobile, email, hashedPassword]
    );

    return NextResponse.json(
      { message: "User created successfully", userId: result.rows[0].id },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}