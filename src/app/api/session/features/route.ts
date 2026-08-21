import { NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/auth";

// Polled by TopNav so an admin toggling a feature for a user takes effect in
// that user's already-open tab, without them refreshing or navigating.
export async function GET() {
  const session = await getActiveSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ enabledFeatures: session.enabledFeatures });
}
