import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, findUserById, adminResetPassword } from "@/lib/auth";

const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generateTempPassword(length = 14): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_ALPHABET[bytes[i] % TEMP_PASSWORD_ALPHABET.length];
  }
  return out;
}

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/admin/users/[id]/reset-password">) {
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

  const tempPassword = generateTempPassword();
  adminResetPassword(target.id, tempPassword);

  // Shown once — the admin is responsible for relaying it to the user.
  return NextResponse.json({ ok: true, tempPassword });
}
