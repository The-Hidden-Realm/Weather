import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { deleteCamera, findCameraById, updateCamera } from "@/lib/cameras";
import { normalizeCameraSourceUrl } from "@/lib/camera-utils";

function isValidSourceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/admin/cameras/[id]">) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const cameraId = Number(id);
  if (!Number.isInteger(cameraId) || !findCameraById(cameraId)) {
    return NextResponse.json({ error: "Camera not found." }, { status: 404 });
  }

  const body = await req.json();
  const patch: {
    name?: string;
    category?: string;
    sourceUrl?: string;
    audioUrl?: string | null;
    isOffline?: boolean;
  } = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
    patch.name = name;
  }
  if (typeof body.category === "string") {
    const category = body.category.trim();
    if (!category) return NextResponse.json({ error: "Category can't be empty." }, { status: 400 });
    patch.category = category;
  }
  if (typeof body.sourceUrl === "string") {
    const rawSourceUrl = body.sourceUrl.trim();
    const sourceUrl = rawSourceUrl ? normalizeCameraSourceUrl(rawSourceUrl) : rawSourceUrl;
    if (!isValidSourceUrl(sourceUrl)) {
      return NextResponse.json({ error: "Source link must be a valid http(s) URL." }, { status: 400 });
    }
    patch.sourceUrl = sourceUrl;
  }
  if (typeof body.audioUrl === "string") {
    const audioUrl = body.audioUrl.trim();
    if (audioUrl && !isValidSourceUrl(audioUrl)) {
      return NextResponse.json({ error: "Audio link must be a valid http(s) URL." }, { status: 400 });
    }
    patch.audioUrl = audioUrl || null;
  }
  if (typeof body.isOffline === "boolean") {
    patch.isOffline = body.isOffline;
  }

  updateCamera(cameraId, patch);
  return NextResponse.json({ ok: true, camera: findCameraById(cameraId) });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/admin/cameras/[id]">) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const cameraId = Number(id);
  if (!Number.isInteger(cameraId) || !findCameraById(cameraId)) {
    return NextResponse.json({ error: "Camera not found." }, { status: 404 });
  }

  deleteCamera(cameraId);
  return NextResponse.json({ ok: true });
}
