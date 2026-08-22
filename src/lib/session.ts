import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "weather_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me";
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: number;
  username: string;
  role: "admin" | "moderator" | "user";
  mustChangePassword: boolean;
  // Which forced-password-change page to send the user to: the shipped
  // default password asks for current + new; an admin-issued temp password
  // asks only for new (they just used it to sign in).
  mustChangePasswordReason: "default" | "admin_reset" | null;
  theme: "dark" | "light";
  // null = follow the current location's timezone instead of a fixed one.
  timezone: string | null;
  timeFormat: "12h" | "24h";
  // Gates the post-signup welcome flow (name, email, timezone, home
  // location). False only for freshly signed-up accounts that haven't
  // finished it yet.
  onboardingCompleted: boolean;
};

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.userId === "number" &&
      typeof payload.username === "string" &&
      (payload.role === "admin" || payload.role === "moderator" || payload.role === "user")
    ) {
      return {
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
        mustChangePassword: payload.mustChangePassword === true,
        mustChangePasswordReason:
          payload.mustChangePasswordReason === "default" || payload.mustChangePasswordReason === "admin_reset"
            ? payload.mustChangePasswordReason
            : null,
        theme: payload.theme === "light" ? "light" : "dark",
        timezone: typeof payload.timezone === "string" ? payload.timezone : null,
        timeFormat: payload.timeFormat === "24h" ? "24h" : "12h",
        // Tokens issued before this field existed carry no value at all —
        // treat that as already onboarded rather than forcing every
        // already-active session through the welcome flow. Only an
        // explicit `false` (freshly signed up, not yet finished) counts.
        onboardingCompleted: payload.onboardingCompleted !== false,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    // Browsers silently drop Secure cookies over plain HTTP, which would
    // otherwise lock everyone out the moment NODE_ENV=production runs
    // without TLS in front of it. Only mark it Secure once the deployer
    // confirms HTTPS is actually terminating somewhere (e.g. a reverse proxy).
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
