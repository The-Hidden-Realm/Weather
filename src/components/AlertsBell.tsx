"use client";

import { useEffect, useRef, useState } from "react";
import type { NwsAlert } from "@/lib/weather/types";
import { playAlertChime } from "@/lib/alertSound";
import { AlertDetailModal } from "@/components/AlertDetailModal";

// NWS doesn't push alerts, so this is a poll — kept short so a newly issued
// warning shows up here within seconds rather than minutes.
const POLL_MS = 30 * 1000;

export function AlertsBell() {
  const [alerts, setAlerts] = useState<NwsAlert[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<NwsAlert | null>(null);
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
          if (isNew) playAlertChime();
          seenIds.current = new Set(fetched.map((a) => a.id));
        }
        setAlerts(fetched);
      } catch {
        // Network hiccup — just try again on the next poll.
      }
    }

    function onLocationChanged() {
      // Whatever's showing right now is for the place that was open a
      // moment ago — clear it immediately instead of waiting out the next
      // poll, and re-baseline so the fresh fetch below doesn't chime for
      // alerts that were already active at the new location.
      seenIds.current = null;
      setAlerts([]);
      poll();
    }

    poll();
    window.addEventListener("weather-location-changed", onLocationChanged);
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("weather-location-changed", onLocationChanged);
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

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Weather alerts"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition hover:border-accent hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {alerts.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white">
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Weather alerts</span>
            {alerts.length > 0 && (
              <button onClick={() => setAlerts([])} className="text-xs text-accent-2 hover:underline">
                Clear all
              </button>
            )}
          </div>
          {alerts.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">No active alerts for your location.</p>
          ) : (
            <div className="max-h-80 divide-y divide-border overflow-y-auto">
              {alerts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setSelected(a);
                    setOpen(false);
                  }}
                  className="block w-full px-3 py-3 text-left hover:bg-accent/10"
                >
                  <p className="text-sm font-semibold text-danger">{a.event}</p>
                  <p className="mt-0.5 text-xs text-foreground/80">{a.headline}</p>
                  <p className="mt-1 text-[11px] text-muted">{a.areaDesc}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && <AlertDetailModal alert={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
