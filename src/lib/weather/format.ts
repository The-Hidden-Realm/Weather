export function formatTemp(value: number): string {
  return `${Math.round(value)}°`;
}

export function formatTime(iso: string, timezone: string, hour12 = true): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    hour12,
  });
}

export function formatHour(iso: string, timezone: string, hour12 = true): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    timeZone: timezone,
    hour12,
  });
}

export function formatDay(iso: string, timezone: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: timezone,
  });
}

export function formatDate(iso: string, timezone: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: timezone,
  });
}

export function compassDirection(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}

export function hPaToInHg(hpa: number): number {
  return hpa * 0.02953;
}

export function formatVisibility(meters: number | null): string {
  if (meters == null) return "—";
  const miles = metersToMiles(meters);
  return `${miles >= 10 ? "10+" : miles.toFixed(1)} mi`;
}

export function formatPressure(hpa: number): string {
  return `${hPaToInHg(hpa).toFixed(2)} inHg`;
}

export function formatWind(mph: number): string {
  return `${Math.round(mph)} mph`;
}

export function formatPrecip(inches: number): string {
  if (inches <= 0) return "0 in";
  return `${inches.toFixed(2)} in`;
}
