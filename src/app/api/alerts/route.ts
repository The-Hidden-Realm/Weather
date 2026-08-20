import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb, type LocationRow } from "@/lib/db";
import { fetchNwsAlerts } from "@/lib/weather/nws";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const location = getDb()
    .prepare("SELECT * FROM locations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(session.userId) as LocationRow | undefined;

  if (!location) {
    return NextResponse.json({ alerts: [] });
  }

  const { alerts } = await fetchNwsAlerts(location.lat, location.lon);
  return NextResponse.json({ alerts });
}
