import { formatTime } from "@/lib/weather/format";

// Normal scheduled pulls show the 15-minute slot the data belongs to (9:00,
// 9:15, 9:30, 9:45...) rather than the exact fetch instant. An admin's own
// manual refresh is the one exception — see `exact` below.
function alignedTimeLabel(iso: string, timezone: string, hour12: boolean): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const hour24 = get("hour");
  const flooredMinute = Math.floor(get("minute") / 15) * 15;
  const minuteStr = String(flooredMinute).padStart(2, "0");

  if (!hour12) return `${String(hour24).padStart(2, "0")}:${minuteStr}`;
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour}:${minuteStr} ${hour24 < 12 ? "AM" : "PM"}`;
}

export function LastUpdated({
  fetchedAt,
  timezone,
  hour12 = true,
  exact = false,
  isAdmin,
  onRefresh,
  refreshing,
}: {
  fetchedAt: string;
  timezone: string;
  hour12?: boolean;
  // True right after an admin's own manual refresh: show the exact time
  // instead of the floored interval, until the next scheduled pull resumes
  // normal aligned display.
  exact?: boolean;
  isAdmin: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const label = exact ? formatTime(fetchedAt, timezone, hour12) : alignedTimeLabel(fetchedAt, timezone, hour12);

  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <span>Last updated {label}</span>
      {isAdmin && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="text-muted underline decoration-dotted underline-offset-2 transition hover:text-foreground disabled:opacity-60"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      )}
    </div>
  );
}
