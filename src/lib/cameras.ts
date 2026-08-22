import { getDb, type CameraRow } from "@/lib/db";
import { MAX_CAMERA_SLOTS, isCameraLayoutMode, type CameraLayoutMode } from "@/lib/camera-utils";

// Sized for the largest layout mode (9) so a saved slot assignment survives
// switching down to a smaller mode and back up.
export const CAMERA_SLOT_COUNT = MAX_CAMERA_SLOTS;

export function listCameras(): CameraRow[] {
  return getDb().prepare("SELECT * FROM cameras ORDER BY category ASC, name ASC").all() as CameraRow[];
}

export function listCameraCategories(): string[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT category FROM cameras ORDER BY category ASC")
    .all() as { category: string }[];
  return rows.map((r) => r.category);
}

export function getPrivateCategorySet(): Set<string> {
  const rows = getDb()
    .prepare("SELECT category FROM camera_categories WHERE is_private = 1")
    .all() as { category: string }[];
  return new Set(rows.map((r) => r.category));
}

// Cameras filtered for a non-admin viewer — anything sitting in a category
// an admin marked private is left out entirely, even if it's already
// assigned to that user's layout (it'll just render as an empty slot).
export function listVisibleCameras(isAdmin: boolean): CameraRow[] {
  const all = listCameras();
  if (isAdmin) return all;
  const privateCategories = getPrivateCategorySet();
  return all.filter((c) => !privateCategories.has(c.category));
}

export function listVisibleCameraCategories(isAdmin: boolean): string[] {
  const all = listCameraCategories();
  if (isAdmin) return all;
  const privateCategories = getPrivateCategorySet();
  return all.filter((c) => !privateCategories.has(c));
}

// Powers the admin dialog's Categories tab — every category that currently
// has at least one camera, with its privacy flag (defaulting to false for a
// category that's never been toggled).
export function listCategoryPrivacy(): { category: string; isPrivate: boolean }[] {
  const categories = listCameraCategories();
  const rows = getDb().prepare("SELECT category, is_private FROM camera_categories").all() as {
    category: string;
    is_private: number;
  }[];
  const privacyByCategory = new Map(rows.map((r) => [r.category, r.is_private === 1]));
  return categories.map((category) => ({ category, isPrivate: privacyByCategory.get(category) ?? false }));
}

export function setCategoryPrivate(category: string, isPrivate: boolean) {
  getDb()
    .prepare(
      `INSERT INTO camera_categories (category, is_private) VALUES (?, ?)
       ON CONFLICT(category) DO UPDATE SET is_private = excluded.is_private`
    )
    .run(category, isPrivate ? 1 : 0);
}

export function setCameraOffline(id: number, isOffline: boolean) {
  getDb().prepare("UPDATE cameras SET is_offline = ? WHERE id = ?").run(isOffline ? 1 : 0, id);
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
  patch: {
    name?: string;
    category?: string;
    sourceUrl?: string;
    audioUrl?: string | null;
    isOffline?: boolean;
  }
) {
  const existing = findCameraById(id);
  if (!existing) return;
  const nextAudioUrl = patch.audioUrl !== undefined ? patch.audioUrl : existing.audio_url;
  const nextIsOffline = patch.isOffline !== undefined ? (patch.isOffline ? 1 : 0) : existing.is_offline;
  getDb()
    .prepare(
      "UPDATE cameras SET name = ?, category = ?, source_url = ?, has_audio = ?, audio_url = ?, is_offline = ? WHERE id = ?"
    )
    .run(
      patch.name ?? existing.name,
      patch.category ?? existing.category,
      patch.sourceUrl ?? existing.source_url,
      nextAudioUrl ? 1 : 0,
      nextAudioUrl,
      nextIsOffline,
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

export function getCameraLayoutMode(userId: number): CameraLayoutMode {
  const row = getDb().prepare("SELECT camera_layout_mode FROM users WHERE id = ?").get(userId) as
    | { camera_layout_mode: number }
    | undefined;
  return row && isCameraLayoutMode(row.camera_layout_mode) ? row.camera_layout_mode : 6;
}

export function setCameraLayoutMode(userId: number, mode: CameraLayoutMode) {
  getDb().prepare("UPDATE users SET camera_layout_mode = ? WHERE id = ?").run(mode, userId);
}
