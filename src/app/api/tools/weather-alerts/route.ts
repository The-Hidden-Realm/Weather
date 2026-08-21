import { NextRequest, NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/auth";
import { fetchNwsAlerts } from "@/lib/weather/nws";

// Lets a user pull active alerts for an arbitrary searched location without
// touching their home-location alerts (AlertsBell) at all — this route never
// reads or writes the saved `locations` row.
export async function GET(req: NextRequest) {
  const session = await getActiveSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.enabledFeatures.includes("weather-alerts")) {
    return NextResponse.json({ error: "This tool isn't enabled for your account." }, { status: 403 });
  }

  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required." }, { status: 400 });
  }

  const { alerts, ok } = await fetchNwsAlerts(lat, lon);
  return NextResponse.json({ alerts, ok });
}
