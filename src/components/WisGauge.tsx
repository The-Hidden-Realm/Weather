"use client";

import { useEffect, useRef, useState } from "react";
import type { WisScore } from "@/lib/weather/types";
import { WIS_BANDS, LIFE_THREATENING_BAND } from "@/lib/weather/wisScore";
import { WisHowToReadModal } from "@/components/WisHowToReadModal";

const COLOR_VAR: Record<WisScore["color"], string> = {
  good: "var(--good)",
  warn: "var(--warn)",
  danger: "var(--danger)",
};

export function WisGauge({ wis }: { wis: WisScore }) {
  const [howToReadOpen, setHowToReadOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const warningRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (warningRef.current && !warningRef.current.contains(e.target as Node)) {
        setWarningOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const isLifeThreatening = wis.label === LIFE_THREATENING_BAND.label;
  // The ring itself tops out at 100% full even when the underlying score
  // climbs past 100 in life-threatening mode — the number keeps counting up.
  const offset = circumference * (1 - Math.min(wis.score, 100) / 100);
  const color = COLOR_VAR[wis.color];

  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-medium text-muted">WIS Score</h2>
            <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-2">
              Beta
            </span>
            <div ref={warningRef} className="relative">
              <button
                type="button"
                onClick={() => setWarningOpen((o) => !o)}
                aria-label="About this score"
                className="flex text-warn hover:text-warn/80"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                </svg>
              </button>
              {warningOpen && (
                <div className="absolute left-0 z-20 mt-2 w-56 rounded-lg border border-border bg-surface-2 p-3 text-xs text-foreground shadow-xl">
                  Experimental score for informational purposes only — not an official weather warning and
                  not a substitute for National Weather Service alerts.
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted/70">Weather Intensity Score</p>
        </div>
        <button
          onClick={() => setHowToReadOpen(true)}
          className="rounded-md px-2 py-1 text-xs text-accent-2 hover:bg-accent/10"
        >
          How to read
        </button>
      </div>

      <div className="mt-4 flex items-center gap-6">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 128 128" className="h-32 w-32 -rotate-90">
            <circle cx="64" cy="64" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold text-foreground">{wis.score}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted">
              {isLifeThreatening ? "Uncapped" : "/ 100"}
            </span>
          </div>
        </div>

        <div>
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
              isLifeThreatening ? "animate-pulse" : ""
            }`}
            style={{ background: `${color}22`, color }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {wis.label}
          </div>
          <p className="mt-2 max-w-[16rem] text-sm text-muted">
            {isLifeThreatening
              ? LIFE_THREATENING_BAND.description
              : WIS_BANDS.find((b) => b.label === wis.label)?.description}
          </p>
        </div>
      </div>

      {isLifeThreatening && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
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
          Life-threatening weather in progress — take shelter now. This score has no ceiling and will keep
          climbing as conditions worsen.
        </p>
      )}

      {wis.alertsUnavailable && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs text-warn">
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
          Active alerts couldn&rsquo;t be checked for this update — this score may understate risk.
        </p>
      )}

      {howToReadOpen && (
        <WisHowToReadModal
          currentScore={wis.score}
          alertsUnavailable={wis.alertsUnavailable}
          onClose={() => setHowToReadOpen(false)}
        />
      )}
    </div>
  );
}
