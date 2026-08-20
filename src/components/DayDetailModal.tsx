"use client";

import { useEffect } from "react";
import type { DailyPoint, HourlyPoint } from "@/lib/weather/types";
import { describeWeatherCode } from "@/lib/weather/wmo";
import { WeatherIcon } from "@/components/WeatherIcon";
import { formatDate, formatHour, formatTemp } from "@/lib/weather/format";

export function DayDetailModal({
  day,
  dayLabel,
  hourly,
  timezone,
  onClose,
}: {
  day: DailyPoint;
  dayLabel: string;
  hourly: HourlyPoint[];
  timezone: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { description, icon } = describeWeatherCode(day.weatherCode, true);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="flex items-center gap-3">
            <WeatherIcon icon={icon} className="h-10 w-10" />
            <div>
              <p className="text-lg font-semibold text-foreground">
                {dayLabel} · {formatDate(day.date, timezone)}
              </p>
              <p className="text-sm text-foreground/80">{description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-border p-5">
          <div className="rounded-xl border border-border/60 bg-surface-2/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted/80">High / Low</p>
            <p className="text-sm font-medium text-foreground">
              {formatTemp(day.tempMax)} / {formatTemp(day.tempMin)}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-surface-2/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted/80">Precipitation</p>
            <p className="text-sm font-medium text-foreground">
              {day.precipitationProbability}% chance · {day.precipitationSum.toFixed(2)} in
            </p>
          </div>
        </div>

        <div className="border-b border-border p-5">
          <p className="flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs text-warn">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="mt-0.5 shrink-0"
            >
              <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
            This is a forecast, not a guarantee — hourly conditions for this day may change as it gets
            closer.
          </p>
        </div>

        <div className="divide-y divide-border p-5 pt-2">
          {hourly.length === 0 && (
            <p className="py-4 text-center text-sm text-muted">No hourly detail available for this day.</p>
          )}
          {hourly.map((h) => {
            const { icon: hourIcon } = describeWeatherCode(h.weatherCode, h.isDay);
            return (
              <div key={h.time} className="flex items-center gap-3 py-2.5">
                <span className="w-14 shrink-0 text-xs text-muted">{formatHour(h.time, timezone)}</span>
                <WeatherIcon icon={hourIcon} className="h-7 w-7 shrink-0" />
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
    </div>
  );
}
