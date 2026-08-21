import { NextRequest, NextResponse } from "next/server";
import {
  getSessionUser,
  findUserById,
  updateFirstName,
  updateEmail,
  updateTheme,
  updateTimezone,
  updateTimeFormat,
  completeOnboarding,
  setSessionCookie,
} from "@/lib/auth";
import { isValidTimeZone } from "@/lib/time";
import { setUserLocation } from "@/lib/locations";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// One-time submission for the post-signup welcome flow: name, recovery
// email, timezone, clock format, and a home location. Unlike /api/account,
// every field here is required (except timezone, which can stay "Automatic")
// since the whole point is to finish setting up a bare-bones new account.
export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = findUserById(session.userId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  if (!firstName || firstName.length > 50) {
    return NextResponse.json({ error: "Enter your first name." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  let timezone: string | null = null;
  if (body.timezone !== null && body.timezone !== undefined && body.timezone !== "") {
    if (typeof body.timezone !== "string" || !isValidTimeZone(body.timezone)) {
      return NextResponse.json({ error: "That timezone isn't recognized." }, { status: 400 });
    }
    timezone = body.timezone;
  }

  const timeFormat = body.timeFormat === "24h" ? "24h" : "12h";
  const theme = body.theme === "light" ? "light" : "dark";

  const location = body.location;
  if (
    !location ||
    typeof location !== "object" ||
    !location.label ||
    typeof location.lat !== "number" ||
    typeof location.lon !== "number"
  ) {
    return NextResponse.json({ error: "Choose your home location." }, { status: 400 });
  }

  updateFirstName(user.id, firstName);
  updateEmail(user.id, email);
  updateTheme(user.id, theme);
  updateTimezone(user.id, timezone);
  updateTimeFormat(user.id, timeFormat);
  setUserLocation(user.id, {
    label: location.label,
    state: location.state,
    zip: location.zip,
    lat: location.lat,
    lon: location.lon,
  });
  completeOnboarding(user.id);

  await setSessionCookie({
    userId: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: user.must_change_password === 1,
    mustChangePasswordReason:
      user.must_change_password_reason === "default" || user.must_change_password_reason === "admin_reset"
        ? user.must_change_password_reason
        : null,
    theme,
    timezone,
    timeFormat,
    onboardingCompleted: true,
  });

  return NextResponse.json({ ok: true });
}
