import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { AVAILABLE_FEATURES, type FeatureKey } from "@/lib/features";
import { getAutoApproveFeatures, setAutoApproveFeatures } from "@/lib/settings";

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ features: getAutoApproveFeatures() });
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!Array.isArray(body.features) || !body.features.every((f: unknown) => typeof f === "string")) {
    return NextResponse.json({ error: "features must be an array of strings." }, { status: 400 });
  }
  const features = body.features.filter((f: string): f is FeatureKey =>
    (AVAILABLE_FEATURES as readonly string[]).includes(f)
  );

  setAutoApproveFeatures(features);
  return NextResponse.json({ ok: true, features });
}
