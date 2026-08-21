import { NextRequest, NextResponse } from "next/server";
import {
  getSessionUser,
  findUserById,
  findUserByUsername,
  updateUsername,
  updateTheme,
  updateTimezone,
  updateTimeFormat,
  updateFirstName,
  updateEmail,
  setSessionCookie,
} from "@/lib/auth";
import { isValidTimeZone } from "@/lib/time";

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  let firstName = user.first_name;
  if (typeof body.firstName === "string" && body.firstName.trim() !== user.first_name) {
    const cleanFirstName = body.firstName.trim();
    if (!cleanFirstName || cleanFirstName.length > 50) {
      return NextResponse.json({ error: "Name must be 1-50 characters." }, { status: 400 });
    }
    updateFirstName(user.id, cleanFirstName);
    firstName = cleanFirstName;
  }

  let email = user.email;
  if (typeof body.email === "string" && body.email.trim() !== user.email) {
    const cleanEmail = body.email.trim();
    if (!EMAIL_RE.test(cleanEmail)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    updateEmail(user.id, cleanEmail);
    email = cleanEmail;
  }

  await setSessionCookie({
    userId: user.id,
    username,
    role: user.role,
    mustChangePassword: user.must_change_password === 1,
    mustChangePasswordReason:
      user.must_change_password_reason === "default" || user.must_change_password_reason === "admin_reset"
        ? user.must_change_password_reason
        : null,
    theme,
    timezone,
    timeFormat,
    onboardingCompleted: user.onboarding_completed === 1,
  });

  return NextResponse.json({ ok: true, username, theme, timezone, timeFormat, firstName, email });
}
