import bcrypt from "bcryptjs";
import { getDb, type UserRow } from "@/lib/db";
import { getSessionUser, clearSessionCookie, type SessionPayload } from "@/lib/session";

export {
  SESSION_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  getSessionUser,
  setSessionCookie,
  clearSessionCookie,
  type SessionPayload,
} from "@/lib/session";

// Re-checks the DB (not just the JWT) so an admin deactivating an account
// takes effect on this user's very next page load, not just their next login.
export async function getActiveSessionUser(): Promise<SessionPayload | null> {
  const session = await getSessionUser();
  if (!session) return null;
  const user = findUserById(session.userId);
  if (!user || user.is_active === 0) {
    await clearSessionCookie();
    return null;
  }
  return session;
}

export function findUserByUsername(username: string): UserRow | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as UserRow | undefined;
}

export function findUserById(id: number): UserRow | undefined {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
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

export function updatePassword(userId: number, newPassword: string) {
  const hash = bcrypt.hashSync(newPassword, 10);
  getDb()
    .prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?")
    .run(hash, userId);
}

export function updateUsername(userId: number, username: string) {
  getDb().prepare("UPDATE users SET username = ? WHERE id = ?").run(username, userId);
}

export function updateTheme(userId: number, theme: "dark" | "light") {
  getDb().prepare("UPDATE users SET theme = ? WHERE id = ?").run(theme, userId);
}

export function updateTimezone(userId: number, timezone: string | null) {
  getDb().prepare("UPDATE users SET timezone = ? WHERE id = ?").run(timezone, userId);
}

export function updateTimeFormat(userId: number, timeFormat: "12h" | "24h") {
  getDb().prepare("UPDATE users SET time_format = ? WHERE id = ?").run(timeFormat, userId);
}

export function recordLogin(userId: number) {
  getDb().prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(userId);
}

export function listAllUsers(): (UserRow & { location_count: number })[] {
  return getDb()
    .prepare(
      `SELECT u.*, (SELECT COUNT(*) FROM locations l WHERE l.user_id = u.id) as location_count
       FROM users u ORDER BY u.created_at ASC`
    )
    .all() as (UserRow & { location_count: number })[];
}

export function setUserActive(userId: number, active: boolean) {
  getDb().prepare("UPDATE users SET is_active = ? WHERE id = ?").run(active ? 1 : 0, userId);
}

export function setUserRole(userId: number, role: "admin" | "user") {
  getDb().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
}

// Distinct from updatePassword: this is for an admin resetting someone
// else's password, so it forces a change on next login instead of clearing
// the flag (the admin doesn't know the account owner's chosen password).
export function adminResetPassword(userId: number, tempPassword: string) {
  const hash = bcrypt.hashSync(tempPassword, 10);
  getDb()
    .prepare("UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?")
    .run(hash, userId);
}

export function deleteUser(userId: number) {
  const db = getDb();
  const tx = db.transaction((id: number) => {
    db.prepare("DELETE FROM locations WHERE user_id = ?").run(id);
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
  });
  tx(userId);
}
