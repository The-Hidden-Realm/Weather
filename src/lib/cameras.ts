import { getDb, type CameraRow } from "@/lib/db";

export const CAMERA_SLOT_COUNT = 6;

export function listCameras(): CameraRow[] {
  return getDb().prepare("SELECT * FROM cameras ORDER BY category ASC, name ASC").all() as CameraRow[];
}

export function listCameraCategories(): string[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT category FROM cameras ORDER BY category ASC")
    .all() as { category: string }[];
  return rows.map((r) => r.category);
}

export function findCameraById(id: number): CameraRow | undefined {
  return getDb().prepare("SELECT * FROM cameras WHERE id = ?").get(id) as CameraRow | undefined;
}

export function createCamera(
  name: string,
  category: string,
  sourceUrl: string,
  audioUrl: string | null
): CameraRow {
  const db = getDb();
  const info = db
    .prepare(
      "INSERT INTO cameras (name, category, source_url, has_audio, audio_url) VALUES (?, ?, ?, ?, ?)"
    )
    .run(name, category, sourceUrl, audioUrl ? 1 : 0, audioUrl);
  return db.prepare("SELECT * FROM cameras WHERE id = ?").get(info.lastInsertRowid) as CameraRow;
}

export function updateCamera(
  id: number,
  patch: { name?: string; category?: string; sourceUrl?: string; audioUrl?: string | null }
) {
  const existing = findCameraById(id);
  if (!existing) return;
  const nextAudioUrl = patch.audioUrl !== undefined ? patch.audioUrl : existing.audio_url;
  getDb()
    .prepare(
      "UPDATE cameras SET name = ?, category = ?, source_url = ?, has_audio = ?, audio_url = ? WHERE id = ?"
    )
    .run(
      patch.name ?? existing.name,
      patch.category ?? existing.category,
      patch.sourceUrl ?? existing.source_url,
      nextAudioUrl ? 1 : 0,
      nextAudioUrl,
      id
    );
}

export function deleteCamera(id: number) {
  getDb().prepare("DELETE FROM cameras WHERE id = ?").run(id);
}

// Returns a fixed-length array of camera ids (or null for an empty slot),
// indexed by slot position.
export function getCameraLayout(userId: number): (number | null)[] {
  const rows = getDb()
    .prepare("SELECT slot, camera_id FROM camera_layout WHERE user_id = ?")
    .all(userId) as { slot: number; camera_id: number | null }[];
  const layout: (number | null)[] = new Array(CAMERA_SLOT_COUNT).fill(null);
  for (const row of rows) {
    if (row.slot >= 0 && row.slot < CAMERA_SLOT_COUNT) {
      layout[row.slot] = row.camera_id;
    }
  }
  return layout;
}

export function setCameraLayoutSlot(userId: number, slot: number, cameraId: number | null) {
  getDb()
    .prepare(
      `INSERT INTO camera_layout (user_id, slot, camera_id) VALUES (?, ?, ?)
       ON CONFLICT(user_id, slot) DO UPDATE SET camera_id = excluded.camera_id`
    )
    .run(userId, slot, cameraId);
}
