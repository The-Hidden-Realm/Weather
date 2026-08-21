"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionPayload } from "@/lib/session";
import type { FeatureKey } from "@/lib/features";
import { AlertsBell } from "@/components/AlertsBell";

const NAV_LINKS: { href: string; label: string; feature: FeatureKey | null }[] = [
  { href: "/", label: "Home", feature: null },
  { href: "/cameras", label: "Cameras", feature: "cameras" },
];

const TOOLS_LINKS: { href: string; label: string; feature: FeatureKey }[] = [
  { href: "/tools/weather-alerts", label: "Weather Alerts", feature: "weather-alerts" },
  { href: "/tools/spc-outlooks", label: "NWS SPC Outlooks", feature: "spc-outlooks" },
  { href: "/tools/hurricane-tracker", label: "Hurricane Tracker", feature: "hurricane-tracker" },
  { href: "/tools/storm-prediction", label: "Storm Prediction", feature: "storm-prediction" },
  { href: "/tools/outdoor-activity", label: "Outdoor Activity Planning", feature: "outdoor-activity" },
];

// Keeps nav links in sync with an admin toggling this user's features while
// their tab is already open, instead of only picking it up on next load.
const FEATURE_POLL_MS = 3000;

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-accent/15 text-accent-2" : "text-muted hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

export function TopNav({ session }: { session: SessionPayload & { enabledFeatures: FeatureKey[] } }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [enabledFeatures, setEnabledFeatures] = useState(session.enabledFeatures);
  const menuRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpen(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(target)) {
        setToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/session/features");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.enabledFeatures)) {
          setEnabledFeatures(data.enabledFeatures);
        }
      } catch {
        // Network hiccup — just try again on the next poll.
      }
    }

    const interval = setInterval(poll, FEATURE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const visibleToolsLinks = TOOLS_LINKS.filter((link) => enabledFeatures.includes(link.feature));

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6-1.7A4 4 0 0 0 6 16h11.5Z" />
            </svg>
          </div>
          <span className="font-semibold text-foreground">The Hidden Realm Weather</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_LINKS.filter((link) => !link.feature || enabledFeatures.includes(link.feature)).map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} active={pathname === link.href} />
          ))}

          {visibleToolsLinks.length > 0 && (
            <div ref={toolsRef} className="relative">
              <button
                onClick={() => setToolsOpen((o) => !o)}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  toolsOpen || visibleToolsLinks.some((l) => pathname === l.href)
                    ? "bg-accent/15 text-accent-2"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                Tools
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-transform ${toolsOpen ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {toolsOpen && (
                <div className="absolute left-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-xl">
                  {visibleToolsLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setToolsOpen(false)}
                      className="block px-3 py-2.5 text-sm text-foreground hover:bg-accent/10"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <AlertsBell />

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:border-accent hover:text-foreground"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-[11px] font-medium text-accent-2">
                {session.username.slice(0, 1).toUpperCase()}
              </span>
              <span>
                Logged in as <span className="font-medium text-foreground">{session.username}</span>
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform ${open ? "rotate-180" : ""}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {open && (
              <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-xl">
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent/10"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                  </svg>
                  Settings
                </Link>

                {session.role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent/10"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3Z" />
                    </svg>
                    Admin panel
                  </Link>
                )}

                <div className="border-t border-border" />

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-danger hover:bg-danger/10"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
