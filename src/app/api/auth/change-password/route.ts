import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, findUserById, verifyPassword, updatePassword, setSessionCookie } from "@/lib/auth";
import { DEFAULT_ADMIN_PASSWORD } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();

  const user = findUserById(session.userId);
  if (!user || typeof currentPassword !== "string" || !verifyPassword(user, currentPassword)) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }
  if (newPassword === DEFAULT_ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Choose a password other than the default one." },
      { status: 400 }
    );
  }

  updatePassword(user.id, newPassword);
  await setSessionCookie({
    userId: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: false,
  });

  return NextResponse.json({ ok: true });
}
