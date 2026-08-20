"use client";

import { useEffect, useRef, useState } from "react";
import type { GeocodeResult } from "@/lib/weather/types";
import type { SavedLocation } from "@/components/Dashboard";
import { LastUpdated } from "@/components/LastUpdated";

export function LocationHeader({
  location,
  onSet,
  error,
  lastUpdated,
}: {
  location: SavedLocation | null;
  onSet: (result: GeocodeResult) => Promise<void>;
  error: string | null;
  lastUpdated?: {
    fetchedAt: string;
    timezone: string;
    hour12?: boolean;
    exact?: boolean;
    isAdmin: boolean;
    onRefresh: () => void;
    refreshing: boolean;
  } | null;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    // Debounced search-as-you-type sync against the query string.
    if (query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  async function handlePick(result: GeocodeResult) {
    await onSet(result);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await handlePick({
          id: -1,
          name: "",
          country: "",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          timezone: "auto",
        });
        setLocating(false);
      },
      () => setLocating(false)
    );
  }

  const title = location
    ? [location.label, [location.state, location.zip].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", ")
    : "No location set";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h1>
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>

      <div className="flex items-center gap-3">
        {lastUpdated && (
          <LastUpdated
            fetchedAt={lastUpdated.fetchedAt}
            timezone={lastUpdated.timezone}
            hour12={lastUpdated.hour12}
            exact={lastUpdated.exact}
            isAdmin={lastUpdated.isAdmin}
            onRefresh={lastUpdated.onRefresh}
            refreshing={lastUpdated.refreshing}
          />
        )}

        <div ref={boxRef} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:border-accent hover:text-foreground"
          >
            Change location
          </button>

          {open && (
            <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-xl">
              <div className="p-3">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search city, state…"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>

              {query.trim().length >= 2 && (
                <div className="max-h-64 overflow-y-auto border-t border-border">
                  {searching && <div className="px-3 py-2 text-xs text-muted">Searching…</div>}
                  {!searching && results.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted">No matches.</div>
                  )}
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handlePick(r)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent/10"
                    >
                      <span className="text-foreground">{r.name}</span>
                      <span className="text-xs text-muted">
                        {[r.admin1, r.country].filter(Boolean).join(", ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={handleUseMyLocation}
                disabled={locating}
                className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-accent-2 hover:bg-accent/10 disabled:opacity-60"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
                {locating ? "Locating…" : "Use my current location"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
