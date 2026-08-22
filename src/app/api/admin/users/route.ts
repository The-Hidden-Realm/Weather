import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, findUserByUsername, adminCreateUser } from "@/lib/auth";

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username, password } = await req.json();
  const cleanUsername = String(username || "").trim();

  if (!USERNAME_RE.test(cleanUsername)) {
    return NextResponse.json(
      { error: "Username must be 3-32 characters (letters, numbers, _ . -)." },
      { status: 400 }
    );
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (cleanUsername.toLowerCase() === "admin") {
    return NextResponse.json({ error: "That username is reserved." }, { status: 400 });
  }
  if (findUserByUsername(cleanUsername)) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  }

  const user = adminCreateUser(cleanUsername, password);
  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      must_change_password: user.must_change_password,
      must_change_password_reason: user.must_change_password_reason,
      enabled_features: user.enabled_features,
      theme: user.theme,
      timezone: user.timezone,
      time_format: user.time_format,
      is_active: user.is_active,
      last_login: user.last_login,
      first_name: user.first_name,
      email: user.email,
      onboarding_completed: user.onboarding_completed,
      camera_layout_mode: user.camera_layout_mode,
      created_at: user.created_at,
      location_count: 0,
    },
  });
}
