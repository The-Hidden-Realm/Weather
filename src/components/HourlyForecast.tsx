import type { HourlyPoint } from "@/lib/weather/types";
import { describeWeatherCode } from "@/lib/weather/wmo";
import { WeatherIcon } from "@/components/WeatherIcon";
import { formatHour, formatTemp } from "@/lib/weather/format";

export function HourlyForecast({
  hourly,
  timezone,
  hour12 = true,
}: {
  hourly: HourlyPoint[];
  timezone: string;
  hour12?: boolean;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface/70 p-5">
      <h2 className="mb-3 text-sm font-medium text-muted">Next 12 hours</h2>
      <div className="flex-1 divide-y divide-border overflow-y-auto">
        {hourly.map((h, i) => {
          const { icon } = describeWeatherCode(h.weatherCode, h.isDay);
          return (
            <div key={h.time} className="flex items-center gap-3 py-2.5">
              <span className="w-12 shrink-0 text-xs text-muted">
                {i === 0 ? "Now" : formatHour(h.time, timezone, hour12)}
              </span>
              <WeatherIcon icon={icon} className="h-7 w-7 shrink-0" />
              <span className="w-10 flex-1 text-sm font-semibold text-foreground">
                {formatTemp(h.temperature)}
              </span>
              <span
                className={`flex w-10 items-center justify-end gap-0.5 text-[11px] ${
                  h.precipitationProbability > 0 ? "text-accent-2" : "text-muted/60"
                }`}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2c4 5.5 7 9 7 12.5A7 7 0 0 1 5 14.5C5 11 8 7.5 12 2Z" />
                </svg>
                {h.precipitationProbability}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
