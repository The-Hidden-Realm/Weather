"use client";

import { useEffect, useRef, useState } from "react";
import type { GeocodeResult } from "@/lib/weather/types";
import type { SavedLocation } from "@/components/Dashboard";

export function LocationPicker({
  locations,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
  onUseMyLocation,
}: {
  locations: SavedLocation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onAdd: (result: GeocodeResult) => void;
  onRemove: (id: number) => void;
  onUseMyLocation: () => void;
  }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
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
    if (query.trim().length < 2) {
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {locations.map((loc) => (
        <div
          key={loc.id}
          className={`group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
            loc.id === selectedId
              ? "border-accent bg-accent/15 text-foreground"
              : "border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          <button onClick={() => onSelect(loc.id)}>{loc.label}</button>
          <button
            onClick={() => onRemove(loc.id)}
            className="ml-0.5 hidden text-muted hover:text-danger group-hover:inline"
            aria-label={`Remove ${loc.label}`}
          >
            ×
          </button>
        </div>
      ))}

      <button
        onClick={onUseMyLocation}
        className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        Use my location
      </button>

      <div ref={boxRef} className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Add a location…"
          className="w-48 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent"
        />
        {open && (query.trim().length >= 2) && (
          <div className="absolute z-20 mt-1 w-72 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-xl">
            {searching && <div className="px-3 py-2 text-xs text-muted">Searching…</div>}
            {!searching && results.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted">No matches.</div>
            )}
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  onAdd(r);
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
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
      </div>
    </div>
  );
}
