"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionPayload } from "@/lib/session";

export function TopNav({ session }: { session: SessionPayload }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6-1.7A4 4 0 0 0 6 16h11.5Z" />
            </svg>
          </div>
          <span className="font-semibold text-foreground">Wisp Weather</span>
        </Link>

        <div className="flex items-center gap-4">
          {session.role === "admin" && (
            <Link href="/admin" className="text-sm text-muted hover:text-accent-2">
              Admin
            </Link>
          )}
          <span className="hidden text-sm text-muted sm:inline">{session.username}</span>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:border-accent hover:text-foreground"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
