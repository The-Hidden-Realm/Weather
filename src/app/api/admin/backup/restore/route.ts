import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, verifyAdminPassword } from "@/lib/auth";
import { restoreBackup } from "@/lib/backup";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (!verifyAdminPassword(session, body.adminPassword)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 403 });
  }

  if (!body.backup || typeof body.backup !== "object") {
    return NextResponse.json({ error: "No backup data provided." }, { status: 400 });
  }

  const result = restoreBackup(body.backup, session.userId);

  // Turn each raw token into a full link here — backup.ts has no notion of
  // the request's origin, and the token should never be logged or returned
  // as anything other than a ready-to-send URL.
  const usersCreated = result.usersCreated.map((u) => ({
    username: u.username,
    recoveryUrl: new URL(`/recover/${u.recoveryToken}`, req.nextUrl.origin).toString(),
  }));

  return NextResponse.json({ ok: true, result: { ...result, usersCreated } });
}
