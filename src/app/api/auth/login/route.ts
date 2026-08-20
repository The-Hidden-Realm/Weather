import { NextRequest, NextResponse } from "next/server";
import { findUserByUsername, verifyPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const user = findUserByUsername(String(username).trim());
  if (!user || !verifyPassword(user, String(password))) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  await setSessionCookie({ userId: user.id, username: user.username, role: user.role });

  return NextResponse.json({ ok: true, role: user.role });
}
