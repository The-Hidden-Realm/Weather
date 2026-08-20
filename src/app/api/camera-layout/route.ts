import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { CAMERA_SLOT_COUNT, findCameraById, getCameraLayout, setCameraLayoutSlot } from "@/lib/cameras";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ layout: getCameraLayout(session.userId) });
}

// Assigns one camera (or clears it) to one slot in the caller's own
// 6-tile view — every user manages their own layout independently.
export async function PUT(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const slot = Number(body.slot);
  if (!Number.isInteger(slot) || slot < 0 || slot >= CAMERA_SLOT_COUNT) {
    return NextResponse.json({ error: "Invalid slot." }, { status: 400 });
  }

  let cameraId: number | null = null;
  if (body.cameraId !== null && body.cameraId !== undefined) {
    cameraId = Number(body.cameraId);
    if (!Number.isInteger(cameraId) || !findCameraById(cameraId)) {
      return NextResponse.json({ error: "Camera not found." }, { status: 404 });
    }
  }

  setCameraLayoutSlot(session.userId, slot, cameraId);
  return NextResponse.json({ ok: true, layout: getCameraLayout(session.userId) });
}
