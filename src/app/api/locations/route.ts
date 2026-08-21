import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb, type LocationRow } from "@/lib/db";
import { setUserLocation } from "@/lib/locations";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = getDb()
    .prepare("SELECT * FROM locations WHERE user_id = ? ORDER BY created_at ASC")
    .all(session.userId) as LocationRow[];

  return NextResponse.json({ locations: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label, state, zip, lat, lon } = await req.json();
  if (!label || typeof lat !== "number" || typeof lon !== "number") {
    return NextResponse.json({ error: "label, lat, lon are required." }, { status: 400 });
  }

  const row = setUserLocation(session.userId, { label, state, zip, lat, lon });
  return NextResponse.json({ location: row });
}
