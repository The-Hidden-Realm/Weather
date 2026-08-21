import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, pushFeaturesToAllUsers } from "@/lib/auth";
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

// Retroactively grants every currently-toggled-on auto-approve feature to
// every existing user who doesn't already have it — the toggle above only
// affects new signups on its own. Takes the feature list from the request
// body (what the admin's screen actually shows) rather than re-reading
// instance_settings, so this can't race a just-toggled switch whose PATCH
// save hasn't landed yet.
export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const features =
    body && Array.isArray(body.features) && body.features.every((f: unknown) => typeof f === "string")
      ? body.features.filter((f: string): f is FeatureKey => (AVAILABLE_FEATURES as readonly string[]).includes(f))
      : getAutoApproveFeatures();

  const updatedCount = pushFeaturesToAllUsers(features);
  return NextResponse.json({ ok: true, updatedCount });
}
