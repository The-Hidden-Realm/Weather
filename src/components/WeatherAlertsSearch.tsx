"use client";

import { useEffect, useState } from "react";
import type { GeocodeResult, NwsAlert } from "@/lib/weather/types";
import { AlertDetailModal } from "@/components/AlertDetailModal";

export function WeatherAlertsSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<GeocodeResult | null>(null);
  const [alerts, setAlerts] = useState<NwsAlert[] | null>(null);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<NwsAlert | null>(null);

  useEffect(() => {
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
    setSelected(result);
    setResults([]);
    setQuery("");
    setError(null);
    setAlerts(null);
    setLoadingAlerts(true);
    try {
      const params = new URLSearchParams({ lat: String(result.lat), lon: String(result.lon) });
      const res = await fetch(`/api/tools/weather-alerts?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't load alerts for that location.");
        return;
      }
      setAlerts(data.alerts ?? []);
    } catch {
      setError("Couldn't load alerts for that location.");
    } finally {
      setLoadingAlerts(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface/70 p-5">
        <label className="mb-1.5 block text-xs font-medium text-muted">Search a location</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="City, state…"
          className="w-full max-w-sm rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
        />

        {query.trim().length >= 2 && (
          <div className="mt-2 max-h-64 max-w-sm overflow-y-auto rounded-lg border border-border">
            {searching && <div className="px-3 py-2 text-xs text-muted">Searching…</div>}
            {!searching && results.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted">No matches.</div>
            )}
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => handlePick(r)}
                className="flex w-full flex-col items-start border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent/10"
              >
                <span className="text-foreground">{r.name}</span>
                <span className="text-xs text-muted">{[r.admin1, r.country].filter(Boolean).join(", ")}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="rounded-2xl border border-border bg-surface/70 p-5">
          <h3 className="text-sm font-medium text-foreground">
            Active alerts for {selected.name}
            {selected.admin1 ? `, ${selected.admin1}` : ""}
          </h3>

          {loadingAlerts && <p className="mt-3 text-sm text-muted">Loading…</p>}

          {!loadingAlerts && error && (
            <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          {!loadingAlerts && !error && alerts && alerts.length === 0 && (
            <p className="mt-3 text-sm text-muted">No active alerts for this location.</p>
          )}

          {!loadingAlerts && !error && alerts && alerts.length > 0 && (
            <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
              {alerts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setDetail(a)}
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

      {detail && <AlertDetailModal alert={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
