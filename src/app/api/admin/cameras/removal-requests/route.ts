import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createRemovalRequest, findCameraById, listPendingRemovalRequests } from "@/lib/cameras";

// Admin sees every pending request (across all moderators); a moderator has
// no reason to list these today (they only ever create one via POST below).
export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ requests: listPendingRemovalRequests() });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || (session.role !== "admin" && session.role !== "moderator")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const cameraId = Number(body.cameraId);
  if (!Number.isInteger(cameraId) || !findCameraById(cameraId)) {
    return NextResponse.json({ error: "Camera not found." }, { status: 404 });
  }

  const request = createRemovalRequest(cameraId, session.userId);
  return NextResponse.json({ ok: true, request });
}
