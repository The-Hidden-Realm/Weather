import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/signup"];

// The onboarding page itself, plus the API routes it calls to look up and
// save a home location — these must stay reachable while onboarding is
// incomplete instead of being redirected like every other route.
const ONBOARDING_PATH = "/onboarding";
const ONBOARDING_API_PATHS = ["/api/onboarding", "/api/geocode", "/api/reverse-geocode", "/api/locations"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/recover/") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.mustChangePassword) {
    // Both reasons land on /reset-password: the user just proved identity
    // by signing in with the password being replaced, so there's no need
    // to ask for it again.
    if (pathname !== "/reset-password") {
      return NextResponse.redirect(new URL("/reset-password", req.url));
    }
  } else if (!session.onboardingCompleted) {
    if (pathname !== ONBOARDING_PATH && !ONBOARDING_API_PATHS.includes(pathname)) {
      return NextResponse.redirect(new URL(ONBOARDING_PATH, req.url));
    }
  }

  if (pathname.startsWith("/admin") && session.role !== "admin" && session.role !== "moderator") {
    return NextResponse.redirect(new URL("/access-denied", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
