import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, findUserById, adminResetPassword, verifyAdminPassword, generateTempPassword } from "@/lib/auth";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/admin/users/[id]/reset-password">) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  if (userId === session.userId) {
    return NextResponse.json(
      { error: "You can't reset your own password here — use Settings." },
      { status: 400 }
    );
  }

  const target = findUserById(userId);
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (!verifyAdminPassword(session, body.adminPassword)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 403 });
  }

  const tempPassword = generateTempPassword();
  adminResetPassword(target.id, tempPassword);

  // Shown once — the admin is responsible for relaying it to the user.
  return NextResponse.json({ ok: true, tempPassword });
}
