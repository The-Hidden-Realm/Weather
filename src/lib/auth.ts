import bcrypt from "bcryptjs";
import { getDb, type UserRow } from "@/lib/db";

export {
  SESSION_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  getSessionUser,
  setSessionCookie,
  clearSessionCookie,
  type SessionPayload,
} from "@/lib/session";

export function findUserByUsername(username: string): UserRow | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE")
    .get(username) as UserRow | undefined;
}

export function createUser(username: string, password: string, role: "admin" | "user" = "user"): UserRow {
  const hash = bcrypt.hashSync(password, 10);
  const db = getDb();
  const info = db
    .prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)")
    .run(username, hash, role);
  return db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid) as UserRow;
}

export function verifyPassword(user: UserRow, password: string): boolean {
  return bcrypt.compareSync(password, user.password_hash);
}
