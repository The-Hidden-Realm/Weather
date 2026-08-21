import { NextRequest, NextResponse } from "next/server";
import { findUserByUsername, createUser, setSessionCookie, setUserFeatures } from "@/lib/auth";
import { getAutoApproveFeatures } from "@/lib/settings";

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const cleanUsername = String(username || "").trim();

  if (!USERNAME_RE.test(cleanUsername)) {
    return NextResponse.json(
      { error: "Username must be 3-32 characters (letters, numbers, _ . -)." },
      { status: 400 }
    );
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (cleanUsername.toLowerCase() === "admin") {
    return NextResponse.json(
      { error: "That username is reserved." },
      { status: 400 }
    );
  }
  if (findUserByUsername(cleanUsername)) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  }

  const user = createUser(cleanUsername, password, "user");
  const autoFeatures = getAutoApproveFeatures();
  if (autoFeatures.length > 0) {
    setUserFeatures(user.id, autoFeatures);
  }
  await setSessionCookie({
    userId: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: false,
    mustChangePasswordReason: null,
    theme: user.theme,
    timezone: user.timezone,
    timeFormat: user.time_format,
    onboardingCompleted: user.onboarding_completed === 1,
  });

  return NextResponse.json({ ok: true, role: user.role });
}
