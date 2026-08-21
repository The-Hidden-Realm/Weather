export function formatTemp(value: number): string {
  return `${Math.round(value)}°`;
}

// For real UTC instants (e.g. a server-set `fetchedAt` timestamp) — the
// string already carries its own offset ("...Z"), so `new Date(iso)` parses
// it unambiguously and `timeZone` here only controls display.
export function formatTime(iso: string, timezone: string, hour12 = true): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    hour12,
  });
}

// The UTC offset (ms) `timeZone` is at when clocks there read `instant` —
// computed purely from Intl component parts, with no round-trip through
// `new Date(someLocaleString)`, which is itself parsed in whatever timezone
// the *executing* engine defaults to and would silently reintroduce the same
// class of bug this function exists to avoid.
function getUtcOffsetMs(instant: Date, timeZone: string): number {
  const parts: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - instant.getTime();
}

// Open-Meteo's `timezone=auto` returns current/hourly/sunrise/sunset times as
// a naive wall-clock string already expressed in the location's own
// timezone — no UTC offset in the string. `new Date(str)` alone would parse
// it as local time to whatever timezone the *executing* engine defaults to
// (the browser's, almost never the location's), silently shifting the
// instant by however far those two zones differ — e.g. "Now" in the next-12-
// hours list ending up hours off from the real current time. This recovers
// the correct instant by treating the string as a UTC probe, then
// correcting by the source timezone's actual offset at that date (DST-aware
// since the offset is computed for that specific date) before formatting.
function naiveLocalToInstant(naiveIso: string, sourceTimezone: string): Date {
  const probe = new Date(`${naiveIso}Z`);
  const offsetMs = getUtcOffsetMs(probe, sourceTimezone);
  return new Date(probe.getTime() - offsetMs);
}

export function formatForecastTime(
  naiveIso: string,
  sourceTimezone: string,
  displayTimezone: string,
  hour12 = true
): string {
  return naiveLocalToInstant(naiveIso, sourceTimezone).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: displayTimezone,
    hour12,
  });
}

// Daily-forecast dates come back as a plain "YYYY-MM-DD" that's already the
// location's own calendar day (Open-Meteo's timezone=auto), not an instant
// in time. `new Date("YYYY-MM-DD")` parses that as UTC midnight, and
// re-projecting a UTC midnight into a negative-offset timezone rolls it back
// to the previous day — e.g. "today" showing up as the wrong weekday. Parse
// the numbers directly and format in UTC so no offset shift ever applies.
function parseCalendarDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDay(dateStr: string): string {
  return parseCalendarDate(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

export function formatDate(dateStr: string): string {
  return parseCalendarDate(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function compassDirection(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}

export function formatVisibility(meters: number | null): string {
  if (meters == null) return "—";
  const miles = metersToMiles(meters);
  return `${miles >= 10 ? "10+" : miles.toFixed(1)} mi`;
}

export function formatPressure(hpa: number): string {
  return `${Math.round(hpa)} hPa`;
}

export function formatWind(mph: number): string {
  return `${Math.round(mph)} mph`;
}

export function formatPrecip(inches: number): string {
  if (inches <= 0) return "0 in";
  return `${inches.toFixed(2)} in`;
}
