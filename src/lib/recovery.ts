import { randomBytes, createHash } from "node:crypto";
import { getDb, type UserRow } from "@/lib/db";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Only the hash is ever stored — the raw token is the bearer secret and
// exists only in the URL shown once to the admin.
export function createRecoveryToken(userId: number): string {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  getDb()
    .prepare("INSERT INTO recovery_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)")
    .run(userId, hashToken(token), expiresAt);
  return token;
}

// Single-use: an unexpired, not-yet-used token resolves to its user and is
// immediately marked used in the same transaction, so a link can't be
// redeemed twice even if two requests race.
export function consumeRecoveryToken(token: string): UserRow | null {
  if (typeof token !== "string" || !token) return null;
  const db = getDb();

  const redeem = db.transaction((tokenHash: string): UserRow | null => {
    const row = db
      .prepare(
        `SELECT * FROM recovery_tokens
         WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')`
      )
      .get(tokenHash) as { id: number; user_id: number } | undefined;
    if (!row) return null;

    db.prepare("UPDATE recovery_tokens SET used_at = datetime('now') WHERE id = ?").run(row.id);
    return db.prepare("SELECT * FROM users WHERE id = ?").get(row.user_id) as UserRow | undefined ?? null;
  });

  return redeem(hashToken(token));
}
