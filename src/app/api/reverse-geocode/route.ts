import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/weather/reverseGeocode";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon query params are required." }, { status: 400 });
  }

  const result = await reverseGeocode(lat, lon);
  return NextResponse.json(result);
}
