import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listCameras, listCameraCategories } from "@/lib/cameras";

// Available to any logged-in user — the camera catalog is a shared,
// system-wide resource, not per-account data.
export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cameras = listCameras();
  const categories = listCameraCategories();
  return NextResponse.json({ cameras, categories });
}
