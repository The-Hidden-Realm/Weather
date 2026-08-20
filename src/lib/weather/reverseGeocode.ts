export type ReverseGeocodeResult = {
  name: string;
  state: string;
  zip: string;
};

// Open-Meteo only does forward search, not reverse lookups, and it doesn't
// carry postal codes. BigDataCloud's client-reverse-geocode endpoint is free,
// keyless, and gives us city/state/zip from a lat/lon — exactly the fields
// we need for the location title.
export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    localityLanguage: "en",
  });

  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error(`reverse geocode failed: ${res.status}`);
    const data = await res.json();
    return {
      name: data.city || data.locality || "Unknown location",
      state: data.principalSubdivision || "",
      zip: data.postcode || "",
    };
  } catch {
    return { name: "Unknown location", state: "", zip: "" };
  }
}
