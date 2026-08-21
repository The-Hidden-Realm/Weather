import { NextRequest, NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/auth";
import { fetchSpcOutlooks } from "@/lib/weather/spc";

export async function GET(req: NextRequest) {
  const session = await getActiveSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.enabledFeatures.includes("spc-outlooks")) {
    return NextResponse.json({ error: "This tool isn't enabled for your account." }, { status: 403 });
  }

  // Only an admin's own manual refresh is allowed to bypass the shared
  // 15-minute upstream cache — everyone else's polling stays deduped.
  const force = req.nextUrl.searchParams.get("force") === "1" && session.role === "admin";
  const payload = await fetchSpcOutlooks({ force });
  return NextResponse.json(payload);
}
