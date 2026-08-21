import { NextRequest, NextResponse } from "next/server";
import { updatePassword, setSessionCookie } from "@/lib/auth";
import { consumeRecoveryToken } from "@/lib/recovery";
import { DEFAULT_ADMIN_PASSWORD } from "@/lib/db";

// No current-password check and no prior session required — the token
// itself, not a password, is what proves the right person is here. Redeeming
// it sets a real password and signs the user straight in.
export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json();

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }
  if (newPassword === DEFAULT_ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Choose a password other than the default one." },
      { status: 400 }
    );
  }

  const user = consumeRecoveryToken(token);
  if (!user) {
    return NextResponse.json(
      { error: "This recovery link is invalid or has expired." },
      { status: 400 }
    );
  }

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

  return NextResponse.json({ ok: true });
}
