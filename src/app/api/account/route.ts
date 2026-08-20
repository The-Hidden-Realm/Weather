import { NextRequest, NextResponse } from "next/server";
import {
  getSessionUser,
  findUserById,
  findUserByUsername,
  updateUsername,
  updateTheme,
  setSessionCookie,
} from "@/lib/auth";

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

export async function PATCH(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const user = findUserById(session.userId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let username = user.username;
  if (typeof body.username === "string" && body.username.trim() !== user.username) {
    const cleanUsername = body.username.trim();
    if (!USERNAME_RE.test(cleanUsername)) {
      return NextResponse.json(
        { error: "Username must be 3-32 characters (letters, numbers, _ . -)." },
        { status: 400 }
      );
    }
    if (user.role !== "admin" && cleanUsername.toLowerCase() === "admin") {
      return NextResponse.json({ error: "That username is reserved." }, { status: 400 });
    }
    const existing = findUserByUsername(cleanUsername);
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    updateUsername(user.id, cleanUsername);
    username = cleanUsername;
  }

  let theme = user.theme;
  if (body.theme === "dark" || body.theme === "light") {
    updateTheme(user.id, body.theme);
    theme = body.theme;
  }

  await setSessionCookie({
    userId: user.id,
    username,
    role: user.role,
    mustChangePassword: user.must_change_password === 1,
    theme,
  });

  return NextResponse.json({ ok: true, username, theme });
}
