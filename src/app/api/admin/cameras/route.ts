import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createCamera, listCameras } from "@/lib/cameras";
import { normalizeCameraSourceUrl } from "@/lib/camera-utils";

function isValidSourceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Unlike GET /api/cameras (gated by the cameras feature flag, for the
// per-user camera picker), this lists every camera for the admin management
// table regardless of whether the admin's own account has that feature on.
export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ cameras: listCameras() });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const rawSourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
  const sourceUrl = rawSourceUrl ? normalizeCameraSourceUrl(rawSourceUrl) : rawSourceUrl;
  const audioUrl = typeof body.audioUrl === "string" ? body.audioUrl.trim() : "";

  if (!name || !category) {
    return NextResponse.json({ error: "Name and category are required." }, { status: 400 });
  }
  if (!isValidSourceUrl(sourceUrl)) {
    return NextResponse.json({ error: "Source link must be a valid http(s) URL." }, { status: 400 });
  }
  if (audioUrl && !isValidSourceUrl(audioUrl)) {
    return NextResponse.json({ error: "Audio link must be a valid http(s) URL." }, { status: 400 });
  }

  const camera = createCamera(name, category, sourceUrl, audioUrl || null);
  return NextResponse.json({ ok: true, camera });
}
