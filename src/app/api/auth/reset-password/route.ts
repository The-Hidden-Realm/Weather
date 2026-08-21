import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, findUserById, updatePassword, setSessionCookie } from "@/lib/auth";
import { DEFAULT_ADMIN_PASSWORD } from "@/lib/db";

// Used after an admin-issued temp password: the user already proved identity
// by signing in with it, so unlike /api/auth/change-password this doesn't
// ask for the current (temp) password again.
export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  console.log("[reset-password] session:", session);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { newPassword } = await req.json();

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    console.log("[reset-password] rejected: too short");
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }
  if (newPassword === DEFAULT_ADMIN_PASSWORD) {
    console.log("[reset-password] rejected: matches default");
    return NextResponse.json(
      { error: "Choose a password other than the default one." },
      { status: 400 }
    );
  }

  const user = findUserById(session.userId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  updatePassword(user.id, newPassword);
  await setSessionCookie({
    userId: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: false,
    mustChangePasswordReason: null,
    theme: user.theme,
    timezone: user.timezone,
    timeFormat: user.time_format,
  });
  console.log("[reset-password] success for user", user.id, "cookie secure flag env:", process.env.SESSION_COOKIE_SECURE);

  return NextResponse.json({ ok: true });
}
