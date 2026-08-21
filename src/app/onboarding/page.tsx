"use client";

import { useEffect, useState } from "react";
import type { GeocodeResult } from "@/lib/weather/types";
import { resolveLocation, type ResolvedLocation } from "@/lib/resolveLocation";
import { TimezonePicker } from "@/components/TimezonePicker";
import { ClockFormatPicker } from "@/components/ClockFormatPicker";
import { ThemePicker } from "@/components/ThemePicker";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function HomeLocationField({
  location,
  onSelect,
}: {
  location: ResolvedLocation | null;
  onSelect: (loc: ResolvedLocation) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);

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
    setResolving(true);
    try {
      onSelect(await resolveLocation(result));
      setQuery("");
      setResults([]);
    } finally {
      setResolving(false);
    }
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

  return (
    <Field label="Home location" hint="Sets what your homepage shows weather for.">
      {location ? (
        <div className="flex items-center justify-between rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
          <span className="text-foreground">
            {[location.label, [location.state, location.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
          </span>
          <button
            type="button"
            onClick={() => onSelect(null as unknown as ResolvedLocation)}
            className="text-xs text-accent-2 hover:underline"
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, state…"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />

          {query.trim().length >= 2 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border bg-surface-2">
              {searching && <div className="px-3 py-2 text-xs text-muted">Searching…</div>}
              {!searching && results.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted">No matches.</div>
              )}
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handlePick(r)}
                  disabled={resolving}
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent/10 disabled:opacity-60"
                >
                  <span className="text-foreground">{r.name}</span>
                  <span className="text-xs text-muted">{[r.admin1, r.country].filter(Boolean).join(", ")}</span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locating || resolving}
            className="mt-2 flex items-center gap-2 text-sm text-accent-2 hover:underline disabled:opacity-60"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            {locating ? "Locating…" : "Use my current location"}
          </button>
        </>
      )}
    </Field>
  );
}

export default function OnboardingPage() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [timezone, setTimezone] = useState("");
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">("12h");
  const [location, setLocation] = useState<ResolvedLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = firstName.trim().length > 0 && email.trim().length > 0 && location !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) {
      setError("Fill in your name, email, and home location to continue.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          email: email.trim(),
          theme,
          timezone: timezone || null,
          timeFormat,
          location,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't finish setting up your account.");
        return;
      }
      // A full reload (not router.push) so the updated session cookie is
      // guaranteed to be picked up before the homepage renders.
      window.location.href = "/";
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6-1.7A4 4 0 0 0 6 16h11.5Z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-foreground">Finish setting up your account</h1>
          <p className="mt-1 text-xs text-muted">Just a few details before you get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Name">
            <input
              autoFocus
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </Field>

          <Field label="Email" hint="Used for account recovery.">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </Field>

          <Field label="Appearance">
            <ThemePicker value={theme} onChange={setTheme} />
          </Field>

          <Field label="Timezone" hint="Leave on Automatic to follow your home location.">
            <TimezonePicker value={timezone} onChange={setTimezone} />
          </Field>

          <Field label="Clock format">
            <ClockFormatPicker value={timeFormat} onChange={setTimeFormat} />
          </Field>

          <HomeLocationField location={location} onSelect={setLocation} />

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Finishing setup…" : "Finish setup"}
          </button>
        </form>
      </div>
    </div>
  );
}
