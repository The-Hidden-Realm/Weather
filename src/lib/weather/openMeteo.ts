import type { CurrentConditions, DailyPoint, GeocodeResult, HourlyPoint } from "./types";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

type RawForecast = {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    is_day: number[];
    wind_speed_10m: number[];
    relative_humidity_2m: number[];
    visibility: number[];
    uv_index: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
  };
};

export async function fetchOpenMeteoForecast(
  lat: number,
  lon: number
): Promise<{
  timezone: string;
  current: CurrentConditions;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
}> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: "auto",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    forecast_days: "8",
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "cloud_cover",
      "pressure_msl",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
    ].join(","),
    hourly: [
      "temperature_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "is_day",
      "wind_speed_10m",
      "relative_humidity_2m",
      "visibility",
      "uv_index",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "precipitation_sum",
      "wind_speed_10m_max",
      "wind_gusts_10m_max",
      "sunrise",
      "sunset",
      "uv_index_max",
    ].join(","),
  });

  const res = await fetch(`${FORECAST_URL}?${params.toString()}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`Open-Meteo forecast request failed: ${res.status}`);
  }
  const raw = (await res.json()) as RawForecast;

  const nowIndex = findNearestIndex(raw.hourly.time, raw.current.time);
  const visibilityMeters = raw.hourly.visibility[nowIndex] ?? null;

  const current: CurrentConditions = {
    time: raw.current.time,
    temperature: raw.current.temperature_2m,
    feelsLike: raw.current.apparent_temperature,
    weatherCode: raw.current.weather_code,
    isDay: raw.current.is_day === 1,
    windSpeed: raw.current.wind_speed_10m,
    windDirection: raw.current.wind_direction_10m,
    windGust: raw.current.wind_gusts_10m ?? null,
    humidity: raw.current.relative_humidity_2m,
    pressure: raw.current.pressure_msl,
    visibility: visibilityMeters,
    precipitation: raw.current.precipitation,
    cloudCover: raw.current.cloud_cover,
    uvIndex: raw.hourly.uv_index[nowIndex] ?? null,
  };

  const hourly: HourlyPoint[] = raw.hourly.time
    .map((time, i) => ({
      time,
      temperature: raw.hourly.temperature_2m[i],
      feelsLike: raw.hourly.apparent_temperature[i],
      weatherCode: raw.hourly.weather_code[i],
      isDay: raw.hourly.is_day[i] === 1,
      precipitationProbability: raw.hourly.precipitation_probability[i],
      precipitation: raw.hourly.precipitation[i],
      windSpeed: raw.hourly.wind_speed_10m[i],
      humidity: raw.hourly.relative_humidity_2m[i],
    }))
    .slice(nowIndex, nowIndex + 12);

  const daily: DailyPoint[] = raw.daily.time.map((date, i) => ({
    date,
    weatherCode: raw.daily.weather_code[i],
    tempMax: raw.daily.temperature_2m_max[i],
    tempMin: raw.daily.temperature_2m_min[i],
    precipitationProbability: raw.daily.precipitation_probability_max[i],
    precipitationSum: raw.daily.precipitation_sum[i],
    windSpeedMax: raw.daily.wind_speed_10m_max[i],
    windGustMax: raw.daily.wind_gusts_10m_max[i],
    sunrise: raw.daily.sunrise[i],
    sunset: raw.daily.sunset[i],
    uvIndexMax: raw.daily.uv_index_max?.[i] ?? null,
  }));

  return { timezone: raw.timezone, current, hourly, daily: daily.slice(0, 7) };
}

function findNearestIndex(times: string[], target: string): number {
  const idx = times.indexOf(target);
  if (idx >= 0) return idx;
  const targetMs = new Date(target).getTime();
  let bestIdx = 0;
  let bestDiff = Infinity;
  times.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  });
  return bestIdx;
}

export async function geocodeSearch(query: string): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({
    name: query,
    count: "8",
    language: "en",
    format: "json",
  });
  const res = await fetch(`${GEOCODE_URL}?${params.toString()}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const results = (data.results ?? []) as Array<{
    id: number;
    name: string;
    admin1?: string;
    country: string;
    latitude: number;
    longitude: number;
    timezone: string;
  }>;
  return results.map((r) => ({
    id: r.id,
    name: r.name,
    admin1: r.admin1,
    country: r.country,
    lat: r.latitude,
    lon: r.longitude,
    timezone: r.timezone,
  }));
}
