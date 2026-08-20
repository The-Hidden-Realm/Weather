import { NextRequest, NextResponse } from "next/server";
import {
  getSessionUser,
  findUserById,
  findUserByUsername,
  updateUsername,
  updateTheme,
  updateTimezone,
  updateTimeFormat,
  setSessionCookie,
} from "@/lib/auth";

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

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

  let timezone = user.timezone;
  if ("timezone" in body) {
    if (body.timezone === null) {
      updateTimezone(user.id, null);
      timezone = null;
    } else if (typeof body.timezone === "string" && isValidTimeZone(body.timezone)) {
      updateTimezone(user.id, body.timezone);
      timezone = body.timezone;
    } else {
      return NextResponse.json({ error: "That timezone isn't recognized." }, { status: 400 });
    }
  }

  let timeFormat = user.time_format;
  if (body.timeFormat === "12h" || body.timeFormat === "24h") {
    updateTimeFormat(user.id, body.timeFormat);
    timeFormat = body.timeFormat;
  }

  await setSessionCookie({
    userId: user.id,
    username,
    role: user.role,
    mustChangePassword: user.must_change_password === 1,
    theme,
    timezone,
    timeFormat,
  });

  return NextResponse.json({ ok: true, username, theme, timezone, timeFormat });
}
