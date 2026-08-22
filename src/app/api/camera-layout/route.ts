import { NextRequest, NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/auth";
import {
  CAMERA_SLOT_COUNT,
  findCameraById,
  getCameraLayout,
  setCameraLayoutSlot,
  getCameraLayoutMode,
  setCameraLayoutMode,
} from "@/lib/cameras";
import { isCameraLayoutMode } from "@/lib/camera-utils";

export async function GET() {
  const session = await getActiveSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.enabledFeatures.includes("cameras")) {
    return NextResponse.json({ error: "This feature isn't enabled for your account." }, { status: 403 });
  }

  return NextResponse.json({
    layout: getCameraLayout(session.userId),
    mode: getCameraLayoutMode(session.userId),
  });
}

// Switches how many tiles the caller's own grid shows (1/4/6/9) — every
// user picks their own layout independently, same as their slot assignments.
export async function PATCH(req: NextRequest) {
  const session = await getActiveSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.enabledFeatures.includes("cameras")) {
    return NextResponse.json({ error: "This feature isn't enabled for your account." }, { status: 403 });
  }

  const body = await req.json();
  const mode = Number(body.mode);
  if (!isCameraLayoutMode(mode)) {
    return NextResponse.json({ error: "Invalid layout mode." }, { status: 400 });
  }

  setCameraLayoutMode(session.userId, mode);
  return NextResponse.json({ ok: true, mode });
}

// Assigns one camera (or clears it) to one slot in the caller's own
// grid — every user manages their own layout independently.
export async function PUT(req: NextRequest) {
  const session = await getActiveSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.enabledFeatures.includes("cameras")) {
    return NextResponse.json({ error: "This feature isn't enabled for your account." }, { status: 403 });
  }

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
