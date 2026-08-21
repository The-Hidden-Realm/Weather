"use client";

import { useEffect, useRef, useState } from "react";

const TIMEZONES: string[] =
  typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

export const AUTOMATIC_TIMEZONE_LABEL = "Automatic (use location’s timezone)";

// Common US-style names people actually search for ("eastern", "pacific"...)
// rather than the IANA city names those zones are keyed by underneath.
const TIMEZONE_ALIASES: { label: string; tz: string; keywords: string[] }[] = [
  { label: "Eastern Time", tz: "America/New_York", keywords: ["eastern", "et", "est", "edt"] },
  { label: "Central Time", tz: "America/Chicago", keywords: ["central", "ct", "cst", "cdt"] },
  { label: "Mountain Time", tz: "America/Denver", keywords: ["mountain", "mt", "mst", "mdt"] },
  { label: "Arizona Time (no DST)", tz: "America/Phoenix", keywords: ["arizona"] },
  { label: "Pacific Time", tz: "America/Los_Angeles", keywords: ["pacific", "pt", "pst", "pdt"] },
  { label: "Alaska Time", tz: "America/Anchorage", keywords: ["alaska", "akst", "akdt"] },
  { label: "Hawaii Time", tz: "Pacific/Honolulu", keywords: ["hawaii", "hst"] },
  { label: "Atlantic Time", tz: "America/Puerto_Rico", keywords: ["atlantic", "ast"] },
];
const ALIAS_TZ_SET = new Set(TIMEZONE_ALIASES.map((a) => a.tz));

function timezoneLabel(tz: string): string {
  if (tz === "") return AUTOMATIC_TIMEZONE_LABEL;
  const alias = TIMEZONE_ALIASES.find((a) => a.tz === tz);
  return alias ? `${alias.label} (${tz.replace(/_/g, " ")})` : tz.replace(/_/g, " ");
}

export function TimezonePicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const [query, setQuery] = useState(timezoneLabel(value));
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(timezoneLabel(value));
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [value]);

  const needle = query.trim().toLowerCase();
  const aliasMatches = needle
    ? TIMEZONE_ALIASES.filter(
        (a) => a.label.toLowerCase().includes(needle) || a.keywords.some((k) => k.includes(needle))
      )
    : TIMEZONE_ALIASES;
  const matches = (
    needle
      ? TIMEZONES.filter((tz) => tz.replace(/_/g, " ").toLowerCase().includes(needle))
      : TIMEZONES
  )
    .filter((tz) => !ALIAS_TZ_SET.has(tz))
    .slice(0, 50);
  const showAutomatic = !needle || AUTOMATIC_TIMEZONE_LABEL.toLowerCase().includes(needle);

  function selectTimezone(next: string) {
    onChange(next);
    setQuery(timezoneLabel(next));
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        value={query}
        onFocus={(e) => {
          setOpen(true);
          e.target.select();
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        placeholder="Search for a timezone…"
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      />

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface-2 shadow-xl">
          {showAutomatic && (
            <button
              type="button"
              onClick={() => selectTimezone("")}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-accent/10 ${
                value === "" ? "text-accent-2" : "text-foreground"
              }`}
            >
              {AUTOMATIC_TIMEZONE_LABEL}
            </button>
          )}
          {aliasMatches.map((a) => (
            <button
              key={a.tz}
              type="button"
              onClick={() => selectTimezone(a.tz)}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-accent/10 ${
                value === a.tz ? "text-accent-2" : "text-foreground"
              }`}
            >
              {a.label}
              <span className="ml-1.5 text-xs text-muted">{a.tz.replace(/_/g, " ")}</span>
            </button>
          ))}
          {aliasMatches.length > 0 && matches.length > 0 && <div className="border-t border-border" />}
          {matches.map((tz) => (
            <button
              key={tz}
              type="button"
              onClick={() => selectTimezone(tz)}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-accent/10 ${
                value === tz ? "text-accent-2" : "text-foreground"
              }`}
            >
              {timezoneLabel(tz)}
            </button>
          ))}
          {!showAutomatic && aliasMatches.length === 0 && matches.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted">No matching timezone.</p>
          )}
        </div>
      )}
    </div>
  );
}
