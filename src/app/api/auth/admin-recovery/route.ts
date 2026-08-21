import { NextRequest, NextResponse } from "next/server";
import { findUserByUsername, updatePassword } from "@/lib/auth";
import { verifyAdminRecoveryKey } from "@/lib/settings";
import { readSecret } from "@/lib/secrets";

// Public on purpose — this is the "forgot the admin password" escape hatch,
// reached via a hidden Ctrl+Shift+Enter on the sign-in page while signed
// out. Safety comes entirely from the recovery key (bcrypt-hashed, set by
// an admin in the Admin panel), not from requiring an existing session.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const key = typeof body.key === "string" ? body.key : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (!verifyAdminRecoveryKey(key)) {
    return NextResponse.json({ error: "Invalid recovery key." }, { status: 401 });
  }

  const adminUsername = readSecret("ADMIN_USERNAME", "Admin")!;
  const admin = findUserByUsername(adminUsername);
  if (!admin) {
    return NextResponse.json({ error: "Invalid recovery key." }, { status: 401 });
  }

  updatePassword(admin.id, newPassword);
  return NextResponse.json({ ok: true, username: admin.username });
}
