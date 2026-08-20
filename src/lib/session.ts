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
  role: "admin" | "user";
  mustChangePassword: boolean;
  theme: "dark" | "light";
  // null = follow the current location's timezone instead of a fixed one.
  timezone: string | null;
  timeFormat: "12h" | "24h";
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
      (payload.role === "admin" || payload.role === "user")
    ) {
      return {
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
        mustChangePassword: payload.mustChangePassword === true,
        theme: payload.theme === "light" ? "light" : "dark",
        timezone: typeof payload.timezone === "string" ? payload.timezone : null,
        timeFormat: payload.timeFormat === "24h" ? "24h" : "12h",
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
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
