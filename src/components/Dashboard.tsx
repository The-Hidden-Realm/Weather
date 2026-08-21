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

// A string id for the current :00/:15/:30/:45 window in a given timezone,
// e.g. "2026-08-20-14-15". Two fetches in the same window are considered
// equally fresh, so opening the page again doesn't burn a fresh API call.
function quarterHourBucket(timezone: string, at: number = Date.now()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const quarter = Math.floor(Number(get("minute")) / 15) * 15;
  return `${get("year")}-${get("month")}-${get("day")}-${get("hour")}-${String(quarter).padStart(2, "0")}`;
}

function weatherCacheKey(locationId: number): string {
  return `weather-cache:${locationId}`;
}

type WeatherCacheEntry = { payload: WeatherPayload; bucket: string; manual: boolean };

function readWeatherCache(locationId: number): WeatherCacheEntry | null {
  try {
    const raw = localStorage.getItem(weatherCacheKey(locationId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeWeatherCache(locationId: number, payload: WeatherPayload, timezone: string, manual: boolean) {
  try {
    localStorage.setItem(
      weatherCacheKey(locationId),
      JSON.stringify({ payload, bucket: quarterHourBucket(timezone), manual })
    );
  } catch {
    // Caching is a nice-to-have — storage being full/unavailable shouldn't break loading weather.
  }
}

export function Dashboard({
  initialLocation,
  isAdmin = false,
  timezoneOverride = null,
  timeFormat = "12h",
}: {
  initialLocation: SavedLocation | null;
  isAdmin?: boolean;
  timezoneOverride?: string | null;
  timeFormat?: "12h" | "24h";
}) {
  const [location, setLocation] = useState<SavedLocation | null>(initialLocation);
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True only right after the admin's own manual refresh — shows the exact
  // refresh time instead of the floored interval, until the next scheduled
  // pull replaces it and normal aligned display resumes.
  const [lastFetchManual, setLastFetchManual] = useState(false);

  const loadWeather = useCallback(
    async (loc: SavedLocation, opts?: { manual?: boolean }) => {
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
        const manual = opts?.manual ?? false;
        setWeather(data);
        setLastFetchManual(manual);
        writeWeatherCache(loc.id, data, timezoneOverride ?? data.location.timezone, manual);
      } catch {
        setError("Couldn't load weather for this location. Try again in a moment.");
      } finally {
        setLoading(false);
      }
    },
    [timezoneOverride]
  );

  useEffect(() => {
    // Reuse cached weather if we're still inside the 15-minute window it was
    // fetched in, instead of burning a fresh API call every time this page
    // is opened — the quarter-hour scheduler below covers keeping it fresh
    // for a tab that's left open.
    if (!location) return;
    const cached = readWeatherCache(location.id);
    if (cached) {
      const tz = timezoneOverride ?? cached.payload.location.timezone;
      if (quarterHourBucket(tz) === cached.bucket) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWeather(cached.payload);
        setLastFetchManual(cached.manual);
        return;
      }
    }
    loadWeather(location);
  }, [location, loadWeather, timezoneOverride]);

  // The user's fixed timezone choice wins over the location's auto-detected
  // one; falls back to the location's timezone once weather has loaded.
  const effectiveTimezone = timezoneOverride ?? weather?.location.timezone;
  const hour12 = timeFormat !== "24h";

  useEffect(() => {
    // Auto-refresh aligned to :00/:15/:30/:45 on the clock in the user's
    // effective timezone, not "15 minutes after the last fetch" — so a
    // manual refresh in between never pushes this schedule back.
    if (!location || !effectiveTimezone) return;
    const loc = location;
    const timezone = effectiveTimezone;

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
    // loadWeather only changes identity if timezoneOverride changes (a rare
    // settings update, not something that happens on every fetch) — omitted
    // so this timer isn't re-armed on every fetch, which would defeat the
    // quarter-hour alignment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, effectiveTimezone]);

  useEffect(() => {
    // The quarter-hour timer above only fires reliably while this tab is in
    // the foreground — browsers throttle or pause setTimeout in backgrounded
    // tabs, so a tab left open but unfocused can drift and keep showing data
    // from an earlier window. Catch up the moment the tab is looked at again
    // instead of waiting for the next scheduled tick.
    if (!location || !effectiveTimezone || !weather) return;
    function refreshIfStale() {
      if (document.visibilityState !== "visible" || !weather || !location) return;
      const fetchedBucket = quarterHourBucket(effectiveTimezone!, new Date(weather.fetchedAt).getTime());
      if (fetchedBucket !== quarterHourBucket(effectiveTimezone!)) {
        loadWeather(location);
      }
    }
    document.addEventListener("visibilitychange", refreshIfStale);
    window.addEventListener("focus", refreshIfStale);
    return () => {
      document.removeEventListener("visibilitychange", refreshIfStale);
      window.removeEventListener("focus", refreshIfStale);
    };
  }, [location, effectiveTimezone, weather, loadWeather]);

  function handleManualRefresh() {
    // Admin-only, and scoped to this browser session: every fetch already
    // hits the API fresh with no shared cache, so this never touches what
    // other users see, and the quarter-hour timer above keeps ticking
    // independently of this call.
    if (location) loadWeather(location, { manual: true });
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
    // AlertsBell lives in TopNav, a sibling of this component — a window
    // event is the simplest way to tell it its alerts are now stale.
    window.dispatchEvent(new Event("weather-location-changed"));
  }

  return (
    <div className="space-y-5">
      <LocationHeader
        location={location}
        onSet={handleSet}
        error={error}
        lastUpdated={
          weather && effectiveTimezone
            ? {
                fetchedAt: weather.fetchedAt,
                timezone: effectiveTimezone,
                hour12,
                exact: lastFetchManual,
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

      {weather && effectiveTimezone && (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
          <div className="min-w-0 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            <div className="min-w-0">
              <CurrentConditionsCard data={weather} timezone={effectiveTimezone} hour12={hour12} />
            </div>

            <div className="min-w-0 flex flex-col gap-5 self-start">
              <WishGauge wish={weather.wish} />
              <div className="hidden lg:block">
                <SunriseSunsetTiles
                  sunrise={weather.sunrise}
                  sunset={weather.sunset}
                  sourceTimezone={weather.location.timezone}
                  timezone={effectiveTimezone}
                  hour12={hour12}
                  className="w-full"
                />
              </div>
            </div>

            <div className="min-w-0 lg:col-span-2">
              <SevenDayForecast
                daily={weather.daily}
                hourly={weather.hourly}
                sourceTimezone={weather.location.timezone}
                timezone={effectiveTimezone}
                hour12={hour12}
              />
            </div>
          </div>

          <div className="min-w-0">
            <HourlyForecast
              hourly={weather.hourly.slice(0, 12)}
              sourceTimezone={weather.location.timezone}
              timezone={effectiveTimezone}
              hour12={hour12}
            />
          </div>
        </div>
      )}
    </div>
  );
}
