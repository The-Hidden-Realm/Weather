import { NextRequest, NextResponse } from "next/server";
import { findUserByUsername, verifyPassword, setSessionCookie, recordLogin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const user = findUserByUsername(String(username).trim());
  if (!user || !verifyPassword(user, String(password))) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  if (user.is_active === 0) {
    return NextResponse.json({ error: "This account has been deactivated." }, { status: 403 });
  }

  recordLogin(user.id);

  await setSessionCookie({
    userId: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: user.must_change_password === 1,
    theme: user.theme,
    timezone: user.timezone,
    timeFormat: user.time_format,
  });

  return NextResponse.json({ ok: true, role: user.role, mustChangePassword: user.must_change_password === 1 });
}
