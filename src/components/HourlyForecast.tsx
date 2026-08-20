import type { HourlyPoint } from "@/lib/weather/types";
import { describeWeatherCode } from "@/lib/weather/wmo";
import { WeatherIcon } from "@/components/WeatherIcon";
import { formatHour, formatTemp } from "@/lib/weather/format";

export function HourlyForecast({ hourly, timezone }: { hourly: HourlyPoint[]; timezone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-5">
      <h2 className="mb-4 text-sm font-medium text-muted">Next 12 hours</h2>
      <div className="flex gap-4 overflow-x-auto pb-1">
        {hourly.map((h, i) => {
          const { icon } = describeWeatherCode(h.weatherCode, h.isDay);
          return (
            <div
              key={h.time}
              className="flex min-w-[64px] flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center"
            >
              <span className="text-xs text-muted">{i === 0 ? "Now" : formatHour(h.time, timezone)}</span>
              <WeatherIcon icon={icon} className="h-8 w-8" />
              <span className="text-sm font-semibold text-foreground">{formatTemp(h.temperature)}</span>
              {h.precipitationProbability > 0 && (
                <span className="flex items-center gap-0.5 text-[11px] text-accent-2">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2c4 5.5 7 9 7 12.5A7 7 0 0 1 5 14.5C5 11 8 7.5 12 2Z" />
                  </svg>
                  {h.precipitationProbability}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
