import type { DailyPoint } from "@/lib/weather/types";
import { describeWeatherCode } from "@/lib/weather/wmo";
import { WeatherIcon } from "@/components/WeatherIcon";
import { formatDay, formatTemp } from "@/lib/weather/format";

export function SevenDayForecast({ daily, timezone }: { daily: DailyPoint[]; timezone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-5">
      <h2 className="mb-4 text-sm font-medium text-muted">7-day forecast</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {daily.map((d, i) => {
          const { description, icon } = describeWeatherCode(d.weatherCode, true);
          return (
            <div
              key={d.date}
              title={description}
              className="flex min-w-[92px] flex-1 flex-col items-center gap-2 rounded-xl border border-border/60 bg-surface-2/60 px-2 py-4 text-center"
            >
              <span className="text-sm font-medium text-foreground">
                {i === 0 ? "Today" : formatDay(d.date, timezone)}
              </span>
              <WeatherIcon icon={icon} className="h-9 w-9" />
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-foreground">{formatTemp(d.tempMax)}</span>
                <span className="text-xs text-muted">{formatTemp(d.tempMin)}</span>
              </div>
              <span
                className={`flex h-4 items-center gap-0.5 text-[11px] ${
                  d.precipitationProbability > 0 ? "text-accent-2" : "text-muted/60"
                }`}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2c4 5.5 7 9 7 12.5A7 7 0 0 1 5 14.5C5 11 8 7.5 12 2Z" />
                </svg>
                {d.precipitationProbability}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
