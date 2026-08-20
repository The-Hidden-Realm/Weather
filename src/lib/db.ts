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
  `);

  ensureMustChangePasswordColumn(db);
  ensureThemeColumn(db);
  ensureLocationDetailColumns(db);
  ensureUserPreferenceColumns(db);
  ensureAdminControlColumns(db);

  const adminUsername = readSecret("ADMIN_USERNAME", "Admin")!;
  const existingAdmin = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(adminUsername);

  if (!existingAdmin) {
    const adminPassword = readSecret("ADMIN_PASSWORD", DEFAULT_ADMIN_PASSWORD)!;
    const hash = bcrypt.hashSync(adminPassword, 10);
    const mustChange = adminPassword === DEFAULT_ADMIN_PASSWORD ? 1 : 0;
    db.prepare(
      "INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, 'admin', ?)"
    ).run(adminUsername, hash, mustChange);
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
  theme: "dark" | "light";
  timezone: string | null;
  time_format: "12h" | "24h";
  is_active: number;
  last_login: string | null;
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
