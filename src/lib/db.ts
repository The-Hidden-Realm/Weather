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

declare global {
  // eslint-disable-next-line no-var
  var __weatherDb: Database.Database | undefined;
}

function init(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      lat REAL NOT NULL,
      lon REAL NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const adminUsername = readSecret("ADMIN_USERNAME", "Admin")!;
  const existingAdmin = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(adminUsername);

  if (!existingAdmin) {
    const adminPassword = readSecret("ADMIN_PASSWORD", "ChangeMe123!")!;
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.prepare(
      "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')"
    ).run(adminUsername, hash);
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
  created_at: string;
};

export type LocationRow = {
  id: number;
  user_id: number;
  label: string;
  lat: number;
  lon: number;
  is_default: number;
  created_at: string;
};
