"use client";

import { useEffect, useRef, useState } from "react";
import type { NwsAlert } from "@/lib/weather/types";
import { playAlertChime } from "@/lib/alertSound";

const POLL_MS = 5 * 60 * 1000;

export function AlertsBell() {
  const [alerts, setAlerts] = useState<NwsAlert[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const seenIds = useRef<Set<string> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/alerts");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const fetched: NwsAlert[] = data.alerts ?? [];

        if (seenIds.current === null) {
          // Baseline fetch: nothing has "just arrived" yet.
          seenIds.current = new Set(fetched.map((a) => a.id));
        } else {
          const isNew = fetched.some((a) => !seenIds.current!.has(a.id));
          if (isNew) {
            setUnread(true);
            playAlertChime();
          }
          seenIds.current = new Set(fetched.map((a) => a.id));
        }
        setAlerts(fetched);
      } catch {
        // Network hiccup — just try again on the next poll.
      }
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggleOpen() {
    setOpen((o) => !o);
    setUnread(false);
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={toggleOpen}
        aria-label="Weather alerts"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition hover:border-accent hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-xl">
          <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted">
            Weather alerts
          </div>
          {alerts.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">No active alerts for your location.</p>
          ) : (
            <div className="max-h-80 divide-y divide-border overflow-y-auto">
              {alerts.map((a) => (
                <div key={a.id} className="px-3 py-3">
                  <p className="text-sm font-semibold text-danger">{a.event}</p>
                  <p className="mt-0.5 text-xs text-foreground/80">{a.headline}</p>
                  <p className="mt-1 text-[11px] text-muted">{a.areaDesc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
