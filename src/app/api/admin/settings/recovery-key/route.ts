import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasAdminRecoveryKey, setAdminRecoveryKey } from "@/lib/settings";

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ configured: hasAdminRecoveryKey() });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const key = typeof body.key === "string" ? body.key.trim() : "";

  if (!key) {
    setAdminRecoveryKey(null);
    return NextResponse.json({ ok: true, configured: false });
  }

  if (key.length < 8) {
    return NextResponse.json({ error: "Key must be at least 8 characters." }, { status: 400 });
  }

  setAdminRecoveryKey(key);
  return NextResponse.json({ ok: true, configured: true });
}
