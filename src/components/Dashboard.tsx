"use client";

import { useCallback, useEffect, useState } from "react";
import type { GeocodeResult, WeatherPayload } from "@/lib/weather/types";
import { LocationHeader } from "@/components/LocationHeader";
import { WishGauge } from "@/components/WishGauge";
import { CurrentConditionsCard } from "@/components/CurrentConditionsCard";
import { HourlyForecast } from "@/components/HourlyForecast";
import { SevenDayForecast } from "@/components/SevenDayForecast";
import { SunriseSunsetTiles } from "@/components/SunriseSunsetTile";

export type SavedLocation = {
  id: number;
  label: string;
  state: string;
  zip: string;
  lat: number;
  lon: number;
  is_default: number;
};

export function Dashboard({
  initialLocation,
  isAdmin = false,
}: {
  initialLocation: SavedLocation | null;
  isAdmin?: boolean;
}) {
  const [location, setLocation] = useState<SavedLocation | null>(initialLocation);
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWeather = useCallback(async (loc: SavedLocation) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat: String(loc.lat),
        lon: String(loc.lon),
        label: loc.label,
      });
      const res = await fetch(`/api/weather?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load weather.");
      const data = (await res.json()) as WeatherPayload;
      setWeather(data);
    } catch {
      setError("Couldn't load weather for this location. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Refetch whenever the saved location changes — a legitimate sync-with-
    // an-external-system effect, not state derived from other state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (location) loadWeather(location);
  }, [location, loadWeather]);

  const timezone = weather?.location.timezone;

  useEffect(() => {
    // Auto-refresh aligned to :00/:15/:30/:45 on the clock in the location's
    // own timezone, not "15 minutes after the last fetch" — so a manual
    // refresh in between never pushes this schedule back.
    if (!location || !timezone) return;
    const loc = location;

    function msUntilNextQuarterHour() {
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(now);
      const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
      const second = Number(parts.find((p) => p.type === "second")?.value ?? 0);
      const minutesUntilNext = 15 - (minute % 15);
      const msUntil = minutesUntilNext * 60_000 - second * 1000 - now.getMilliseconds();
      return msUntil <= 0 ? msUntil + 15 * 60_000 : msUntil;
    }

    let timer: ReturnType<typeof setTimeout>;
    function scheduleNext() {
      timer = setTimeout(() => {
        loadWeather(loc);
        scheduleNext();
      }, msUntilNextQuarterHour());
    }
    scheduleNext();

    return () => clearTimeout(timer);
    // loadWeather is a stable useCallback ([] deps) — omitted to avoid
    // re-arming the timer on every fetch, which would defeat the alignment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, timezone]);

  function handleManualRefresh() {
    // Admin-only, and scoped to this browser session: every fetch already
    // hits the API fresh with no shared cache, so this never touches what
    // other users see, and the quarter-hour timer above keeps ticking
    // independently of this call.
    if (location) loadWeather(location);
  }

  async function handleSet(result: GeocodeResult) {
    setError(null);
    let label = result.name;
    let state = result.admin1 || "";
    let zip = "";

    try {
      const geoRes = await fetch(`/api/reverse-geocode?lat=${result.lat}&lon=${result.lon}`);
      if (geoRes.ok) {
        const geo = await geoRes.json();
        zip = geo.zip || "";
        if (!label) label = geo.name;
        if (!state) state = geo.state;
      }
    } catch {
      // Reverse geocoding is a nice-to-have for state/zip — press on without it.
    }
    if (!label) label = "Unknown location";

    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, state, zip, lat: result.lat, lon: result.lon }),
    });
    if (!res.ok) {
      setError("Couldn't save that location. Try again.");
      return;
    }
    const data = await res.json();
    setLocation(data.location);
  }

  return (
    <div className="space-y-5">
      <LocationHeader
        location={location}
        onSet={handleSet}
        error={error}
        lastUpdated={
          weather
            ? {
                fetchedAt: weather.fetchedAt,
                timezone: weather.location.timezone,
                isAdmin,
                onRefresh: handleManualRefresh,
                refreshing: loading,
              }
            : null
        }
      />

      {!location && (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <p className="text-foreground">No location set yet.</p>
          <p className="mt-1 text-sm text-muted">Use &ldquo;Change location&rdquo; above to add one.</p>
        </div>
      )}

      {location && loading && !weather && (
        <div className="rounded-2xl border border-border bg-surface/50 p-10 text-center text-sm text-muted">
          Loading weather for {location.label}…
        </div>
      )}

      {weather && (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
          <div className="min-w-0 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            <div className="min-w-0">
              <CurrentConditionsCard data={weather} />
            </div>

            <div className="min-w-0 flex flex-col gap-5 self-start">
              <WishGauge wish={weather.wish} />
              <div className="hidden lg:block">
                <SunriseSunsetTiles
                  sunrise={weather.sunrise}
                  sunset={weather.sunset}
                  timezone={weather.location.timezone}
                  className="w-full"
                />
              </div>
            </div>

            <div className="min-w-0 lg:col-span-2">
              <SevenDayForecast
                daily={weather.daily}
                hourly={weather.hourly}
                timezone={weather.location.timezone}
              />
            </div>
          </div>

          <div className="min-w-0">
            <HourlyForecast hourly={weather.hourly.slice(0, 12)} timezone={weather.location.timezone} />
          </div>
        </div>
      )}
    </div>
  );
}
