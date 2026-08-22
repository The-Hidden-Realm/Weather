import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { getDb, type UserRow } from "@/lib/db";
import { getSessionUser, type SessionPayload } from "@/lib/session";

export {
  SESSION_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  getSessionUser,
  setSessionCookie,
  clearSessionCookie,
  type SessionPayload,
} from "@/lib/session";

export { AVAILABLE_FEATURES, getUserFeatures, type FeatureKey } from "@/lib/features";
import { getUserFeatures, type FeatureKey } from "@/lib/features";

export function setUserFeatures(userId: number, features: FeatureKey[]) {
  getDb().prepare("UPDATE users SET enabled_features = ? WHERE id = ?").run(JSON.stringify(features), userId);
}

// Syncs every existing user's feature access to exactly match `features` —
// grants what's toggled on and missing, and revokes what's toggled off but
// currently present. Backs the admin "push to existing users" action:
// the auto-approve toggles above only cover new signups by themselves, so
// this is how that toggle state gets mirrored onto everyone who already has
// an account, in both directions.
export function pushFeaturesToAllUsers(features: FeatureKey[]): number {
  const db = getDb();
  const users = db.prepare("SELECT * FROM users").all() as UserRow[];
  const target = new Set(features);
  let updatedCount = 0;
  for (const user of users) {
    const current = getUserFeatures(user);
    const matches = current.length === features.length && current.every((f) => target.has(f));
    if (matches) continue;
    setUserFeatures(user.id, features);
    updatedCount++;
  }
  return updatedCount;
}

// Re-checks the DB (not just the JWT) so an admin deactivating an account, or
// changing feature access, takes effect on this user's very next page load,
// not just their next login.
//
// Deliberately does NOT clear the session cookie itself: this is called from
// both Server Components (pages) and Route Handlers, and Next.js only allows
// cookie mutation from the latter — clearing it here would throw when called
// during a page render. Returning null is enough for every caller to treat
// the request as unauthenticated; the stale cookie is harmless and gets
// overwritten the next time this user (or anyone else) logs in.
export async function getActiveSessionUser(): Promise<(SessionPayload & { enabledFeatures: FeatureKey[] }) | null> {
  const session = await getSessionUser();
  if (!session) return null;
  const user = findUserById(session.userId);
  if (!user || user.is_active === 0) {
    return null;
  }
  return { ...session, enabledFeatures: getUserFeatures(user) };
}

export function findUserByUsername(username: string): UserRow | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as UserRow | undefined;
}

export function findUserById(id: number): UserRow | undefined {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

export function createUser(
  username: string,
  password: string,
  role: "admin" | "moderator" | "user" = "user"
): UserRow {
  const hash = bcrypt.hashSync(password, 10);
  const db = getDb();
  const info = db
    .prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)")
    .run(username, hash, role);
  return db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid) as UserRow;
}

// Admin-created accounts always start as role 'user' (promote via setUserRole
// afterward) and with a temp password that forces a change on first login —
// same contract as adminResetPassword, just combined into the initial INSERT
// instead of a follow-up UPDATE.
export function adminCreateUser(username: string, tempPassword: string): UserRow {
  const hash = bcrypt.hashSync(tempPassword, 10);
  const db = getDb();
  const info = db
    .prepare(
      "INSERT INTO users (username, password_hash, role, must_change_password, must_change_password_reason) VALUES (?, ?, 'user', 1, 'admin_reset')"
    )
    .run(username, hash);
  return db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid) as UserRow;
}

export function verifyPassword(user: UserRow, password: string): boolean {
  return bcrypt.compareSync(password, user.password_hash);
}

// Verifies the acting admin's own password, used to confirm sensitive
// actions (delete user, change role, reset password) before they apply.
export function verifyAdminPassword(session: SessionPayload, password: string): boolean {
  if (typeof password !== "string" || !password) return false;
  const admin = findUserById(session.userId);
  return !!admin && verifyPassword(admin, password);
}

export function updatePassword(userId: number, newPassword: string) {
  const hash = bcrypt.hashSync(newPassword, 10);
  getDb()
    .prepare(
      "UPDATE users SET password_hash = ?, must_change_password = 0, must_change_password_reason = NULL WHERE id = ?"
    )
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

// first_name/email are only ever shown to the account owner (Settings) and
// admins (Admin panel) — no other surface reads them.
export function updateFirstName(userId: number, firstName: string) {
  getDb().prepare("UPDATE users SET first_name = ? WHERE id = ?").run(firstName, userId);
}

export function updateEmail(userId: number, email: string) {
  getDb().prepare("UPDATE users SET email = ? WHERE id = ?").run(email, userId);
}

export function completeOnboarding(userId: number) {
  getDb().prepare("UPDATE users SET onboarding_completed = 1 WHERE id = ?").run(userId);
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

export function setUserRole(userId: number, role: "admin" | "moderator" | "user") {
  getDb().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
}

// Distinct from updatePassword: this is for an admin resetting someone
// else's password, so it forces a change on next login instead of clearing
// the flag (the admin doesn't know the account owner's chosen password).
export function adminResetPassword(userId: number, tempPassword: string) {
  const hash = bcrypt.hashSync(tempPassword, 10);
  getDb()
    .prepare(
      "UPDATE users SET password_hash = ?, must_change_password = 1, must_change_password_reason = 'admin_reset' WHERE id = ?"
    )
    .run(hash, userId);
}

const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

// Used both for admin-triggered single resets and for accounts recreated
// during a backup restore — same "shown once" contract either way.
export function generateTempPassword(length = 14): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_ALPHABET[bytes[i] % TEMP_PASSWORD_ALPHABET.length];
  }
  return out;
}

export function deleteUser(userId: number) {
  const db = getDb();
  const tx = db.transaction((id: number) => {
    db.prepare("DELETE FROM locations WHERE user_id = ?").run(id);
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
  });
  tx(userId);
}
