import { formatTime } from "@/lib/weather/format";

export function SunriseSunsetTiles({
  sunrise,
  sunset,
  timezone,
  className = "",
}: {
  sunrise: string;
  sunset: string;
  timezone: string;
  className?: string;
}) {
  const items = [
    {
      label: "Sunrise",
      value: sunrise ? formatTime(sunrise, timezone) : "—",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.8">
          <path d="M12 2v5M4.9 8.9 6.3 10.3M19.1 8.9 17.7 10.3M2 16h2M20 16h2M6 16a6 6 0 0 1 12 0M4 20h16" />
        </svg>
      ),
    },
    {
      label: "Sunset",
      value: sunset ? formatTime(sunset, timezone) : "—",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" strokeWidth="1.8">
          <path d="M12 9V4M4.9 8.9 6.3 10.3M19.1 8.9 17.7 10.3M2 16h2M20 16h2M6 16a6 6 0 0 1 12 0M4 20h16" />
        </svg>
      ),
    },
  ];

  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-surface-2/60 p-3"
        >
          {item.icon}
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted/80">{item.label}</p>
            <p className="text-sm font-medium text-foreground">{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
