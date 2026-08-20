import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb, type LocationRow } from "@/lib/db";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = getDb()
    .prepare("SELECT * FROM locations WHERE user_id = ? ORDER BY created_at ASC")
    .all(session.userId) as LocationRow[];

  return NextResponse.json({ locations: rows });
}

// Each account has exactly one saved location. Setting a new one replaces
// whatever was there before rather than adding to a list.
export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label, state, zip, lat, lon } = await req.json();
  if (!label || typeof lat !== "number" || typeof lon !== "number") {
    return NextResponse.json({ error: "label, lat, lon are required." }, { status: 400 });
  }

  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM locations WHERE user_id = ?").run(session.userId);
    const info = db
      .prepare(
        "INSERT INTO locations (user_id, label, state, zip, lat, lon, is_default) VALUES (?, ?, ?, ?, ?, ?, 1)"
      )
      .run(session.userId, label, state || "", zip || "", lat, lon);
    return info.lastInsertRowid;
  });

  const id = tx();
  const row = db.prepare("SELECT * FROM locations WHERE id = ?").get(id);
  return NextResponse.json({ location: row });
}
