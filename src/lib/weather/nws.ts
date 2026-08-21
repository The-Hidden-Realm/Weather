import type { NwsAlert } from "./types";

const USER_AGENT = "(weather-tracker-app, contact: set CONTACT_EMAIL env var)";

export async function fetchNwsAlerts(lat: number, lon: number): Promise<{ alerts: NwsAlert[]; ok: boolean }> {
  try {
    const url = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": process.env.CONTACT_EMAIL
          ? `(weather-tracker-app, ${process.env.CONTACT_EMAIL})`
          : USER_AGENT,
        Accept: "application/geo+json",
      },
      // Short TTL so a newly issued warning reaches users within the poll
      // interval instead of waiting out a stale cached response too.
      next: { revalidate: 30 },
    });
    if (!res.ok) return { alerts: [], ok: false };
    const data = await res.json();
    const features = (data.features ?? []) as Array<{
      id: string;
      properties: {
        event: string;
        headline: string;
        description: string;
        instruction: string | null;
        severity: string;
        urgency: string;
        certainty: string;
        senderName: string;
        areaDesc: string;
        effective: string;
        expires: string;
      };
    }>;
    const alerts = features.map((f) => ({
      id: f.id,
      event: f.properties.event,
      headline: f.properties.headline,
      description: f.properties.description || "",
      instruction: f.properties.instruction || "",
      severity: f.properties.severity,
      urgency: f.properties.urgency,
      certainty: f.properties.certainty,
      senderName: f.properties.senderName,
      areaDesc: f.properties.areaDesc,
      effective: f.properties.effective,
      expires: f.properties.expires,
    }));
    return { alerts, ok: true };
  } catch {
    // Non-US locations or NWS outages: fail soft, Open-Meteo data still stands on its own.
    return { alerts: [], ok: false };
  }
}
