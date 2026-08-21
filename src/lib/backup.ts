import { getDb, type UserRow, type CameraRow } from "@/lib/db";
import {
  createUser,
  adminResetPassword,
  setUserActive,
  setUserRole,
  setUserFeatures,
  generateTempPassword,
  findUserByUsername,
} from "@/lib/auth";
import { createRecoveryToken } from "@/lib/recovery";
import { getUserFeatures, AVAILABLE_FEATURES, type FeatureKey } from "@/lib/features";

export const BACKUP_VERSION = 1;

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

export type BackupUser = {
  username: string;
  role: "admin" | "user";
  isActive: boolean;
  enabledFeatures: FeatureKey[];
};

export type BackupCamera = {
  name: string;
  category: string;
  sourceUrl: string;
  hasAudio: boolean;
  audioUrl: string | null;
};

export type Backup = {
  version: number;
  createdAt: string;
  users: BackupUser[];
  cameras: BackupCamera[];
};

// Deliberately excludes password_hash, must_change_password, and
// must_change_password_reason — a backup is safe to store/share without
// leaking credentials. Accounts recreated on restore get a one-time
// recovery link instead of ever reusing (or guessing at) a real password.
export function exportBackup(): Backup {
  const db = getDb();
  const userRows = db.prepare("SELECT * FROM users ORDER BY created_at ASC").all() as UserRow[];
  const cameraRows = db.prepare("SELECT * FROM cameras ORDER BY category ASC, name ASC").all() as CameraRow[];

  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    users: userRows.map((u) => ({
      username: u.username,
      role: u.role,
      isActive: u.is_active === 1,
      enabledFeatures: getUserFeatures(u),
    })),
    cameras: cameraRows.map((c) => ({
      name: c.name,
      category: c.category,
      sourceUrl: c.source_url,
      hasAudio: c.has_audio === 1,
      audioUrl: c.audio_url,
    })),
  };
}

function isValidBackupUser(u: unknown): u is BackupUser {
  if (!u || typeof u !== "object") return false;
  const r = u as Record<string, unknown>;
  return (
    typeof r.username === "string" &&
    USERNAME_RE.test(r.username) &&
    (r.role === "admin" || r.role === "user") &&
    typeof r.isActive === "boolean" &&
    Array.isArray(r.enabledFeatures) &&
    r.enabledFeatures.every((f) => typeof f === "string")
  );
}

function isValidBackupCamera(c: unknown): c is BackupCamera {
  if (!c || typeof c !== "object") return false;
  const r = c as Record<string, unknown>;
  return (
    typeof r.name === "string" &&
    r.name.trim().length > 0 &&
    typeof r.category === "string" &&
    r.category.trim().length > 0 &&
    typeof r.sourceUrl === "string" &&
    r.sourceUrl.trim().length > 0 &&
    typeof r.hasAudio === "boolean" &&
    (r.audioUrl === null || typeof r.audioUrl === "string")
  );
}

export type RestoreResult = {
  // recoveryToken is the raw one-time token — the caller (API route) turns
  // it into a full URL, since only it knows the request's origin.
  usersCreated: { username: string; recoveryToken: string }[];
  usersUpdated: string[];
  usersSkipped: { username: string; reason: string }[];
  camerasCreated: number;
  camerasUpdated: number;
  camerasSkipped: number;
};

// Upserts by username / by (name, sourceUrl) — matching rows are updated,
// missing ones are created, and nothing already present is deleted. This is
// what makes it safe to run against a freshly rebuilt (or already-populated)
// instance: it can only ever add back what the backup describes.
export function restoreBackup(data: unknown, currentUserId: number): RestoreResult {
  const result: RestoreResult = {
    usersCreated: [],
    usersUpdated: [],
    usersSkipped: [],
    camerasCreated: 0,
    camerasUpdated: 0,
    camerasSkipped: 0,
  };

  if (!data || typeof data !== "object") return result;
  const backup = data as Record<string, unknown>;
  const users = Array.isArray(backup.users) ? backup.users : [];
  const cameras = Array.isArray(backup.cameras) ? backup.cameras : [];

  for (const raw of users) {
    if (!isValidBackupUser(raw)) {
      const username =
        raw && typeof raw === "object" && typeof (raw as Record<string, unknown>).username === "string"
          ? ((raw as Record<string, unknown>).username as string)
          : "(unknown)";
      result.usersSkipped.push({ username, reason: "Invalid or malformed entry." });
      continue;
    }

    const features = raw.enabledFeatures.filter((f): f is FeatureKey =>
      (AVAILABLE_FEATURES as readonly string[]).includes(f)
    );

    const existing = findUserByUsername(raw.username);
    if (existing) {
      // Never touch role/active status on the account performing the
      // restore — same self-protection the direct admin actions apply.
      if (existing.id !== currentUserId) {
        setUserRole(existing.id, raw.role);
        setUserActive(existing.id, raw.isActive);
      }
      setUserFeatures(existing.id, features);
      result.usersUpdated.push(raw.username);
    } else {
      // The real password was never backed up, so there's no credential to
      // restore — the account is created with a discarded, unknowable
      // password (defense in depth if it were ever somehow guessed, this
      // also forces a change) and the only real way in is the recovery link.
      const discardedPassword = generateTempPassword();
      const created = createUser(raw.username, discardedPassword, raw.role);
      adminResetPassword(created.id, discardedPassword);
      setUserActive(created.id, raw.isActive);
      setUserFeatures(created.id, features);
      const recoveryToken = createRecoveryToken(created.id);
      result.usersCreated.push({ username: raw.username, recoveryToken });
    }
  }

  const db = getDb();
  for (const raw of cameras) {
    if (!isValidBackupCamera(raw)) {
      result.camerasSkipped++;
      continue;
    }

    const existing = db
      .prepare("SELECT id FROM cameras WHERE name = ? AND source_url = ?")
      .get(raw.name, raw.sourceUrl) as { id: number } | undefined;

    if (existing) {
      db.prepare("UPDATE cameras SET category = ?, has_audio = ?, audio_url = ? WHERE id = ?").run(
        raw.category,
        raw.hasAudio ? 1 : 0,
        raw.audioUrl,
        existing.id
      );
      result.camerasUpdated++;
    } else {
      db.prepare(
        "INSERT INTO cameras (name, category, source_url, has_audio, audio_url) VALUES (?, ?, ?, ?, ?)"
      ).run(raw.name, raw.category, raw.sourceUrl, raw.hasAudio ? 1 : 0, raw.audioUrl);
      result.camerasCreated++;
    }
  }

  return result;
}
