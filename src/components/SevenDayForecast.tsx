import type { DailyPoint } from "@/lib/weather/types";
import { describeWeatherCode } from "@/lib/weather/wmo";
import { WeatherIcon } from "@/components/WeatherIcon";
import { formatDay, formatTemp } from "@/lib/weather/format";

export function SevenDayForecast({ daily, timezone }: { daily: DailyPoint[]; timezone: string }) {
  const weekMax = Math.max(...daily.map((d) => d.tempMax));
  const weekMin = Math.min(...daily.map((d) => d.tempMin));
  const range = Math.max(1, weekMax - weekMin);

  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-5">
      <h2 className="mb-3 text-sm font-medium text-muted">7-day forecast</h2>
      <div className="divide-y divide-border">
        {daily.map((d, i) => {
          const { description, icon } = describeWeatherCode(d.weatherCode, true);
          const leftPct = ((d.tempMin - weekMin) / range) * 100;
          const widthPct = ((d.tempMax - d.tempMin) / range) * 100;
          return (
            <div key={d.date} className="grid grid-cols-[3.5rem_2rem_1fr_auto] items-center gap-3 py-3 sm:grid-cols-[4rem_2rem_1fr_6rem]">
              <span className="text-sm font-medium text-foreground">
                {i === 0 ? "Today" : formatDay(d.date, timezone)}
              </span>
              <span title={description}>
                <WeatherIcon icon={icon} className="h-7 w-7" />
              </span>
              <div className="hidden items-center gap-2 sm:flex">
                <span className="w-8 text-right text-xs text-muted">{formatTemp(d.tempMin)}</span>
                <div className="relative h-1.5 flex-1 rounded-full bg-surface-2">
                  <div
                    className="absolute h-full rounded-full bg-gradient-to-r from-accent-2 to-accent"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  />
                </div>
                <span className="w-8 text-xs text-foreground">{formatTemp(d.tempMax)}</span>
              </div>
              <div className="flex items-center justify-end gap-2 text-sm sm:hidden">
                <span className="text-muted">{formatTemp(d.tempMin)}</span>
                <span className="font-medium text-foreground">{formatTemp(d.tempMax)}</span>
              </div>
              <div className="hidden items-center justify-end gap-1 text-xs text-accent-2 sm:flex">
                {d.precipitationProbability > 0 && (
                  <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2c4 5.5 7 9 7 12.5A7 7 0 0 1 5 14.5C5 11 8 7.5 12 2Z" />
                    </svg>
                    {d.precipitationProbability}%
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
