import { NextRequest, NextResponse } from "next/server";
import { fetchOpenMeteoForecast } from "@/lib/weather/openMeteo";
import { fetchNwsAlerts } from "@/lib/weather/nws";
import { computeWishScore } from "@/lib/weather/wishScore";
import type { WeatherPayload } from "@/lib/weather/types";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  const label = req.nextUrl.searchParams.get("label") || "Current location";

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon query params are required." }, { status: 400 });
  }

  try {
    const [forecast, nws] = await Promise.all([
      fetchOpenMeteoForecast(lat, lon),
      fetchNwsAlerts(lat, lon),
    ]);

    const today = forecast.daily[0];
    const wish = computeWishScore(forecast.current, today, nws.alerts, forecast.hourly, nws.ok);

    const payload: WeatherPayload = {
      location: { label, lat, lon, timezone: forecast.timezone },
      current: forecast.current,
      hourly: forecast.hourly,
      daily: forecast.daily,
      alerts: nws.alerts,
      wish,
      sunrise: today?.sunrise ?? "",
      sunset: today?.sunset ?? "",
      source: { openMeteo: true, nws: nws.ok },
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("weather route error", err);
    return NextResponse.json({ error: "Failed to fetch weather data." }, { status: 502 });
  }
}
