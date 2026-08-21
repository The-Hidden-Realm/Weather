import type { GeocodeResult } from "@/lib/weather/types";

export type ResolvedLocation = { label: string; state: string; zip: string; lat: number; lon: number };

// Open-Meteo's forward search doesn't carry state/zip, so a picked result is
// filled in with a reverse-geocode lookup before it's saved as a location.
export async function resolveLocation(result: GeocodeResult): Promise<ResolvedLocation> {
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

  return { label, state, zip, lat: result.lat, lon: result.lon };
}
