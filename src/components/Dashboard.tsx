"use client";

import { useCallback, useEffect, useState } from "react";
import type { GeocodeResult, WeatherPayload } from "@/lib/weather/types";
import { LocationPicker } from "@/components/LocationPicker";
import { WishGauge } from "@/components/WishGauge";
import { CurrentConditionsCard } from "@/components/CurrentConditionsCard";
import { HourlyForecast } from "@/components/HourlyForecast";
import { SevenDayForecast } from "@/components/SevenDayForecast";
import { AlertsBanner } from "@/components/AlertsBanner";

export type SavedLocation = {
  id: number;
  label: string;
  lat: number;
  lon: number;
  is_default: number;
};

export function Dashboard({ initialLocations }: { initialLocations: SavedLocation[] }) {
  const [locations, setLocations] = useState<SavedLocation[]>(initialLocations);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialLocations.find((l) => l.is_default)?.id ?? initialLocations[0]?.id ?? null
  );
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = locations.find((l) => l.id === selectedId) ?? null;

  const loadWeather = useCallback(async (loc: SavedLocation) => {
    setLoading(true);
    setError(null);
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
    if (selected) loadWeather(selected);
  }, [selected, loadWeather]);

  async function handleAdd(result: GeocodeResult) {
    const label = [result.name, result.admin1].filter(Boolean).join(", ");
    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, lat: result.lat, lon: result.lon }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setLocations((prev) => {
      const next = data.location.is_default
        ? prev.map((l) => ({ ...l, is_default: 0 }))
        : prev;
      return [...next, data.location];
    });
    setSelectedId(data.location.id);
  }

  async function handleRemove(id: number) {
    const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setLocations((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? null);
      }
      return next;
    });
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation isn't available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await handleAdd({
          id: -1,
          name: "My Location",
          country: "",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          timezone: "auto",
        });
      },
      () => setError("Couldn't get your location. Check browser permissions.")
    );
  }

  return (
    <div className="space-y-5">
      <LocationPicker
        locations={locations}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onUseMyLocation={handleUseMyLocation}
      />

      {!selected && (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <p className="text-foreground">No location set yet.</p>
          <p className="mt-1 text-sm text-muted">Search above to add your first location.</p>
        </div>
      )}

      {selected && loading && !weather && (
        <div className="rounded-2xl border border-border bg-surface/50 p-10 text-center text-sm text-muted">
          Loading weather for {selected.label}…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {weather && (
        <>
          <AlertsBanner alerts={weather.alerts} />

          <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
            <CurrentConditionsCard data={weather} />
            <WishGauge wish={weather.wish} />
          </div>

          <HourlyForecast hourly={weather.hourly} timezone={weather.location.timezone} />
          <SevenDayForecast daily={weather.daily} timezone={weather.location.timezone} />
        </>
      )}
    </div>
  );
}
