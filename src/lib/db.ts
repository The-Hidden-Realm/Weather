import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { readSecret } from "@/lib/secrets";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(/* turbopackIgnore: true */ DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "weather.db");

// The password the admin account ships with out of the box. Anyone signing
// in with this exact password is forced to set a new one before continuing.
export const DEFAULT_ADMIN_PASSWORD = "ChangeMe123!";

declare global {
   
  var __weatherDb: Database.Database | undefined;
}

function ensureMustChangePasswordColumn(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (columns.some((c) => c.name === "must_change_password")) return;

  db.exec(
    "ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0"
  );

  // Backfill: anyone whose password still is the shipped default gets
  // flagged, even if their row predates this column.
  const users = db.prepare("SELECT id, password_hash FROM users").all() as {
    id: number;
    password_hash: string;
  }[];
  const flagStmt = db.prepare("UPDATE users SET must_change_password = 1 WHERE id = ?");
  for (const u of users) {
    if (bcrypt.compareSync(DEFAULT_ADMIN_PASSWORD, u.password_hash)) {
      flagStmt.run(u.id);
    }
  }
}

// Distinguishes *why* must_change_password is set, so the proxy can send the
// user to the right page: the shipped default password (asks for current +
// new password) vs. an admin-issued temp password (asks only for new — the
// temp password was just used to sign in, re-asking for it is redundant).
function ensureMustChangePasswordReasonColumn(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (columns.some((c) => c.name === "must_change_password_reason")) return;
  db.exec("ALTER TABLE users ADD COLUMN must_change_password_reason TEXT");
  db.exec(
    "UPDATE users SET must_change_password_reason = 'default' WHERE must_change_password = 1"
  );
}

// Per-user opt-in feature flags shown as nav links (Home is unconditional for
// everyone, so it isn't tracked here). Replaces the old "Locations" admin
// column.
function ensureFeatureColumn(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (columns.some((c) => c.name === "enabled_features")) return;
  db.exec("ALTER TABLE users ADD COLUMN enabled_features TEXT NOT NULL DEFAULT '[]'");
  // Cameras already shipped as an unconditional feature before this column
  // existed — preserve access for everyone who already had it.
  db.exec(`UPDATE users SET enabled_features = '["cameras"]'`);
}

function ensureThemeColumn(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (columns.some((c) => c.name === "theme")) return;
  db.exec("ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT 'dark'");
}

function ensureLocationDetailColumns(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(locations)").all() as { name: string }[];
  if (!columns.some((c) => c.name === "state")) {
    db.exec("ALTER TABLE locations ADD COLUMN state TEXT NOT NULL DEFAULT ''");
  }
  if (!columns.some((c) => c.name === "zip")) {
    db.exec("ALTER TABLE locations ADD COLUMN zip TEXT NOT NULL DEFAULT ''");
  }
}

function ensureUserPreferenceColumns(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  // NULL timezone means "follow the current location's timezone".
  if (!columns.some((c) => c.name === "timezone")) {
    db.exec("ALTER TABLE users ADD COLUMN timezone TEXT");
  }
  if (!columns.some((c) => c.name === "time_format")) {
    db.exec("ALTER TABLE users ADD COLUMN time_format TEXT NOT NULL DEFAULT '12h'");
  }
}

function ensureAdminControlColumns(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!columns.some((c) => c.name === "is_active")) {
    db.exec("ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
  }
  if (!columns.some((c) => c.name === "last_login")) {
    db.exec("ALTER TABLE users ADD COLUMN last_login TEXT");
  }
}

// first_name/email are visible only to the account owner (Settings) and
// admins (Admin panel) — never exposed anywhere else. onboarding_completed
// gates the post-signup welcome flow that collects them, so it defaults to
// 0 for brand-new rows; existing accounts are backfilled to 1 below so they
// aren't retroactively forced through a flow that didn't exist yet.
function ensureOnboardingColumns(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!columns.some((c) => c.name === "first_name")) {
    db.exec("ALTER TABLE users ADD COLUMN first_name TEXT NOT NULL DEFAULT ''");
  }
  if (!columns.some((c) => c.name === "email")) {
    db.exec("ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''");
  }
  if (!columns.some((c) => c.name === "onboarding_completed")) {
    db.exec("ALTER TABLE users ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0");
    db.exec("UPDATE users SET onboarding_completed = 1");
  }
}

// Some feeds serve video and audio from separate sources (e.g. a silent
// video stream plus an independent audio-only stream). audio_url holds that
// second link; has_audio is kept in sync with whether it's set.
function ensureCameraAudioUrlColumn(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(cameras)").all() as { name: string }[];
  if (columns.some((c) => c.name === "audio_url")) return;
  db.exec("ALTER TABLE cameras ADD COLUMN audio_url TEXT");
}

// Seeded once, only if no cameras exist yet — so an admin deleting them
// (once real cameras are added) doesn't cause them to reappear on restart.
const TEST_CAMERAS: { name: string; category: string; sourceUrl: string; hasAudio: number }[] = [
  {
    name: "Test Camera 1",
    category: "Test",
    sourceUrl: "https://archive.org/download/big-bunny-sample-video/SampleVideo.mp4",
    hasAudio: 1,
  },
  {
    name: "Test Camera 2",
    category: "Test",
    sourceUrl: "https://archive.org/download/SampleVideo1280x7205mb/SampleVideo_1280x720_5mb.mp4",
    hasAudio: 0,
  },
  {
    name: "Test Camera 3",
    category: "Test",
    sourceUrl: "https://archive.org/download/sample-mp4-file/sample-mp4-file.mp4",
    hasAudio: 0,
  },
  {
    name: "Test Camera 4",
    category: "Test",
    sourceUrl: "https://archive.org/download/Sample-Video-Mp4/IMG_6303.mp4",
    hasAudio: 1,
  },
  {
    name: "Lightning Storm Feed",
    category: "Storm",
    sourceUrl: "https://archive.org/download/LightningPhotoJPEG/Lightning%20PhotoJPEG.mp4",
    hasAudio: 0,
  },
  {
    name: "Cumulus Clouds Timelapse",
    category: "Sky",
    sourceUrl: "https://archive.org/download/CumulusClouds/CumulusCloudsDnxhd.mp4",
    hasAudio: 0,
  },
];

function ensureTestCameras(db: Database.Database) {
  const { count } = db.prepare("SELECT COUNT(*) as count FROM cameras").get() as { count: number };
  if (count > 0) return;
  const insert = db.prepare(
    "INSERT INTO cameras (name, category, source_url, has_audio) VALUES (?, ?, ?, ?)"
  );
  for (const cam of TEST_CAMERAS) {
    insert.run(cam.name, cam.category, cam.sourceUrl, cam.hasAudio);
  }
  console.log(`[db] Seeded ${TEST_CAMERAS.length} test cameras`);
}

function init(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      must_change_password INTEGER NOT NULL DEFAULT 0,
      theme TEXT NOT NULL DEFAULT 'dark',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT '',
      zip TEXT NOT NULL DEFAULT '',
      lat REAL NOT NULL,
      lon REAL NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cameras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      source_url TEXT NOT NULL,
      has_audio INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS camera_layout (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slot INTEGER NOT NULL,
      camera_id INTEGER REFERENCES cameras(id) ON DELETE SET NULL,
      PRIMARY KEY (user_id, slot)
    );

    -- One-time links for accounts recreated by a backup restore (their real
    -- password was never backed up). Only a hash of the token is stored, so
    -- a DB leak alone can't be used to redeem a still-valid link.
    CREATE TABLE IF NOT EXISTS recovery_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  ensureMustChangePasswordColumn(db);
  ensureMustChangePasswordReasonColumn(db);
  ensureFeatureColumn(db);
  ensureThemeColumn(db);
  ensureLocationDetailColumns(db);
  ensureUserPreferenceColumns(db);
  ensureAdminControlColumns(db);
  ensureOnboardingColumns(db);
  ensureCameraAudioUrlColumn(db);
  ensureTestCameras(db);

  const adminUsername = readSecret("ADMIN_USERNAME", "Admin")!;
  const existingAdmin = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(adminUsername);

  if (!existingAdmin) {
    const adminPassword = readSecret("ADMIN_PASSWORD", DEFAULT_ADMIN_PASSWORD)!;
    const hash = bcrypt.hashSync(adminPassword, 10);
    const mustChange = adminPassword === DEFAULT_ADMIN_PASSWORD ? 1 : 0;
    const mustChangeReason = mustChange ? "default" : null;
    db.prepare(
      // The shipped admin account is infrastructure, not a new signup — it
      // skips the onboarding welcome flow entirely.
      "INSERT INTO users (username, password_hash, role, must_change_password, must_change_password_reason, onboarding_completed) VALUES (?, ?, 'admin', ?, ?, 1)"
    ).run(adminUsername, hash, mustChange, mustChangeReason);
    console.log(`[db] Seeded admin account "${adminUsername}"`);
  }

  return db;
}

export function getDb(): Database.Database {
  if (!global.__weatherDb) {
    global.__weatherDb = init();
  }
  return global.__weatherDb;
}

export type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  role: "admin" | "user";
  must_change_password: number;
  must_change_password_reason: string | null;
  enabled_features: string;
  theme: "dark" | "light";
  timezone: string | null;
  time_format: "12h" | "24h";
  is_active: number;
  last_login: string | null;
  first_name: string;
  email: string;
  onboarding_completed: number;
  created_at: string;
};

export type LocationRow = {
  id: number;
  user_id: number;
  label: string;
  state: string;
  zip: string;
  lat: number;
  lon: number;
  is_default: number;
  created_at: string;
};

export type CameraRow = {
  id: number;
  name: string;
  category: string;
  source_url: string;
  has_audio: number;
  audio_url: string | null;
  created_at: string;
};

export type CameraLayoutRow = {
  user_id: number;
  slot: number;
  camera_id: number | null;
};

export type RecoveryTokenRow = {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};
