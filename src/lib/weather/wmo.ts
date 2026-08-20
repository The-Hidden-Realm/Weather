export type IconKey =
  | "clear-day"
  | "clear-night"
  | "partly-cloudy-day"
  | "partly-cloudy-night"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "freezing-rain"
  | "snow"
  | "thunderstorm";

type WmoInfo = { description: string; icon: (isDay: boolean) => IconKey };

const WMO_TABLE: Record<number, WmoInfo> = {
  0: { description: "Clear sky", icon: (d) => (d ? "clear-day" : "clear-night") },
  1: { description: "Mainly clear", icon: (d) => (d ? "clear-day" : "clear-night") },
  2: { description: "Partly cloudy", icon: (d) => (d ? "partly-cloudy-day" : "partly-cloudy-night") },
  3: { description: "Overcast", icon: () => "cloudy" },
  45: { description: "Fog", icon: () => "fog" },
  48: { description: "Rime fog", icon: () => "fog" },
  51: { description: "Light drizzle", icon: () => "drizzle" },
  53: { description: "Drizzle", icon: () => "drizzle" },
  55: { description: "Dense drizzle", icon: () => "drizzle" },
  56: { description: "Freezing drizzle", icon: () => "freezing-rain" },
  57: { description: "Dense freezing drizzle", icon: () => "freezing-rain" },
  61: { description: "Light rain", icon: () => "rain" },
  63: { description: "Rain", icon: () => "rain" },
  65: { description: "Heavy rain", icon: () => "rain" },
  66: { description: "Freezing rain", icon: () => "freezing-rain" },
  67: { description: "Heavy freezing rain", icon: () => "freezing-rain" },
  71: { description: "Light snow", icon: () => "snow" },
  73: { description: "Snow", icon: () => "snow" },
  75: { description: "Heavy snow", icon: () => "snow" },
  77: { description: "Snow grains", icon: () => "snow" },
  80: { description: "Light rain showers", icon: () => "rain" },
  81: { description: "Rain showers", icon: () => "rain" },
  82: { description: "Violent rain showers", icon: () => "rain" },
  85: { description: "Light snow showers", icon: () => "snow" },
  86: { description: "Heavy snow showers", icon: () => "snow" },
  95: { description: "Thunderstorm", icon: () => "thunderstorm" },
  96: { description: "Thunderstorm with hail", icon: () => "thunderstorm" },
  99: { description: "Severe thunderstorm with hail", icon: () => "thunderstorm" },
};

export function describeWeatherCode(code: number, isDay: boolean): { description: string; icon: IconKey } {
  const info = WMO_TABLE[code];
  if (!info) return { description: "Unknown", icon: "cloudy" };
  return { description: info.description, icon: info.icon(isDay) };
}
