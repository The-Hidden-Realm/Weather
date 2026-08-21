import { getDb, type LocationRow } from "@/lib/db";

// Each account has exactly one saved location. Setting a new one replaces
// whatever was there before rather than adding to a list.
export function setUserLocation(
  userId: number,
  location: { label: string; state?: string; zip?: string; lat: number; lon: number }
): LocationRow {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM locations WHERE user_id = ?").run(userId);
    const info = db
      .prepare(
        "INSERT INTO locations (user_id, label, state, zip, lat, lon, is_default) VALUES (?, ?, ?, ?, ?, ?, 1)"
      )
      .run(userId, location.label, location.state || "", location.zip || "", location.lat, location.lon);
    return info.lastInsertRowid;
  });

  const id = tx();
  return db.prepare("SELECT * FROM locations WHERE id = ?").get(id) as LocationRow;
}
