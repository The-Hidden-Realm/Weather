"use client";

import { useEffect } from "react";
import { WISH_BANDS, WISH_FACTOR_INFO, LIFE_THREATENING_BAND } from "@/lib/weather/wishScore";

const COLOR_VAR: Record<string, string> = {
  good: "var(--good)",
  warn: "var(--warn)",
  danger: "var(--danger)",
};

export function WisHowToReadModal({
  currentScore,
  alertsUnavailable,
  onClose,
}: {
  currentScore: number;
  alertsUnavailable?: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-lg font-semibold text-foreground">How to read the WIS score</p>
            <p className="mt-1 text-sm text-foreground/80">
              How intense the weather is right now, for your saved location.
            </p>
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

        <div className="space-y-2 border-b border-border p-5">
          {WISH_BANDS.map((band) => {
            const isCurrent = currentScore >= band.min && currentScore <= band.max;
            const color = COLOR_VAR[band.color];
            return (
              <div
                key={band.label}
                className={`flex items-start gap-3 rounded-xl border p-3 ${
                  isCurrent ? "border-accent bg-accent/10" : "border-border/60 bg-surface-2/60"
                }`}
              >
                <span
                  className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ background: `${color}22`, color }}
                >
                  {band.min}–{band.max}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {band.label}
                    {isCurrent && <span className="ml-2 text-xs font-normal text-accent-2">Current</span>}
                  </p>
                  <p className="text-xs text-muted">{band.description}</p>
                </div>
              </div>
            );
          })}

          <div
            className={`flex items-start gap-3 rounded-xl border p-3 ${
              currentScore > 100 ? "border-danger bg-danger/10" : "border-border/60 bg-surface-2/60"
            }`}
          >
            <span
              className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ background: `${COLOR_VAR[LIFE_THREATENING_BAND.color]}22`, color: COLOR_VAR[LIFE_THREATENING_BAND.color] }}
            >
              100+
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                {LIFE_THREATENING_BAND.label}
                {currentScore > 100 && <span className="ml-2 text-xs font-normal text-accent-2">Current</span>}
              </p>
              <p className="text-xs text-muted">{LIFE_THREATENING_BAND.description}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">What goes into the score</p>
          {WISH_FACTOR_INFO.map((f) => (
            <div key={f.label}>
              <p className="text-sm font-medium text-foreground">{f.label}</p>
              <p className="text-xs text-muted">{f.description}</p>
              {f.label === "Active alerts" && alertsUnavailable && (
                <p className="mt-1 text-xs text-warn">
                  Unavailable for this update — scored as zero for lack of data, not because none are active.
                </p>
              )}
            </div>
          ))}
          <p className="pt-2 text-xs text-muted/80">
            This score reflects current conditions at your saved location only — it&rsquo;s not a forecast
            and not a substitute for official National Weather Service warnings.
          </p>
        </div>
      </div>
    </div>
  );
}
