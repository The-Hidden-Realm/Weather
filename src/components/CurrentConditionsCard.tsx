import type { WeatherPayload } from "@/lib/weather/types";
import { describeWeatherCode } from "@/lib/weather/wmo";
import { WeatherIcon } from "@/components/WeatherIcon";
import { SunriseSunsetTiles } from "@/components/SunriseSunsetTile";
import {
  compassDirection,
  formatPressure,
  formatTemp,
  formatVisibility,
  formatWind,
} from "@/lib/weather/format";

export function CurrentConditionsCard({
  data,
  timezone,
  hour12 = true,
}: {
  data: WeatherPayload;
  timezone: string;
  hour12?: boolean;
}) {
  const { current } = data;
  const { description, icon } = describeWeatherCode(current.weatherCode, current.isDay);

  const stats: { label: string; value: string }[] = [
    { label: "Feels like", value: formatTemp(current.feelsLike) },
    { label: "Wind", value: `${formatWind(current.windSpeed)} ${compassDirection(current.windDirection)}` },
    { label: "Humidity", value: `${Math.round(current.humidity)}%` },
    { label: "Visibility", value: formatVisibility(current.visibility) },
    { label: "Pressure", value: formatPressure(current.pressure) },
    { label: "Precipitation", value: current.precipitation > 0 ? `${current.precipitation.toFixed(2)} in` : "0 in" },
  ];

  return (
    <div className="self-start rounded-2xl border border-border bg-surface/70 p-5">
      <div className="flex items-start justify-between">
        <h2 className="text-sm font-medium text-muted">Current conditions</h2>
        <WeatherIcon icon={icon} className="h-14 w-14" />
      </div>

      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-5xl font-semibold tracking-tight text-foreground">
          {formatTemp(current.temperature)}
        </span>
        <span className="text-sm text-muted">{description}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border/60 bg-surface-2/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted/80">{s.label}</p>
            <p className="text-sm font-medium text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Sunrise/sunset live under the WIS card on large screens instead. */}
      <SunriseSunsetTiles
        sunrise={data.sunrise}
        sunset={data.sunset}
        timezone={timezone}
        hour12={hour12}
        className="mt-3 lg:hidden"
      />
    </div>
  );
}
