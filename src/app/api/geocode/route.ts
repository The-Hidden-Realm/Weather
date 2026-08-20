import { NextRequest, NextResponse } from "next/server";
import { geocodeSearch } from "@/lib/weather/openMeteo";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }
  const results = await geocodeSearch(q);
  return NextResponse.json({ results });
}
