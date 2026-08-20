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

export function Dashboard({ initialLocation }: { initialLocation: SavedLocation | null }) {
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
      <LocationHeader location={location} onSet={handleSet} error={error} />

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
        <div className="grid min-w-0 gap-5 lg:grid-cols-[1.3fr_1fr_20rem]">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1 lg:row-span-2">
            <CurrentConditionsCard data={weather} />
          </div>

          <div className="min-w-0 lg:col-start-2 lg:row-start-1">
            <WishGauge wish={weather.wish} />
          </div>

          <SunriseSunsetTiles
            sunrise={weather.sunrise}
            sunset={weather.sunset}
            timezone={weather.location.timezone}
            className="hidden lg:grid lg:col-start-2 lg:row-start-2"
          />

          <div className="min-w-0 lg:col-start-3 lg:row-start-1 lg:row-span-3">
            <HourlyForecast hourly={weather.hourly} timezone={weather.location.timezone} />
          </div>

          <div className="min-w-0 lg:col-start-1 lg:col-span-2 lg:row-start-3">
            <SevenDayForecast daily={weather.daily} timezone={weather.location.timezone} />
          </div>
        </div>
      )}
    </div>
  );
}
