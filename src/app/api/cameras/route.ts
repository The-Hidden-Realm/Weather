import { NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/auth";
import { listCameras, listCameraCategories } from "@/lib/cameras";

// Available to any logged-in user with the cameras feature enabled — the
// catalog itself is a shared, system-wide resource, not per-account data,
// but access to it is still gated the same as the page (checked here too,
// not just client-side, so the feature flag can't be bypassed via the URL).
export async function GET() {
  const session = await getActiveSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.enabledFeatures.includes("cameras")) {
    return NextResponse.json({ error: "This feature isn't enabled for your account." }, { status: 403 });
  }

  const cameras = listCameras();
  const categories = listCameraCategories();
  return NextResponse.json({ cameras, categories });
}
