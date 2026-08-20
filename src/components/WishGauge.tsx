"use client";

import { useState } from "react";
import type { WishScore } from "@/lib/weather/types";

const COLOR_VAR: Record<WishScore["color"], string> = {
  good: "var(--good)",
  warn: "var(--warn)",
  danger: "var(--danger)",
};

export function WishGauge({ wish }: { wish: WishScore }) {
  const [open, setOpen] = useState(false);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - wish.score / 100);
  const color = COLOR_VAR[wish.color];

  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-muted">WISH Score</h2>
          <p className="text-xs text-muted/70">Weather Intensity Score for Here</p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-md px-2 py-1 text-xs text-accent-2 hover:bg-accent/10"
        >
          {open ? "Hide breakdown" : "Breakdown"}
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
            <span className="text-3xl font-semibold text-foreground">{wish.score}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted">/ 100</span>
          </div>
        </div>

        <div>
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
            style={{ background: `${color}22`, color }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {wish.label}
          </div>
          <p className="mt-2 max-w-[16rem] text-sm text-muted">
            {describeScore(wish)}
          </p>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          {wish.factors.map((f) => (
            <div key={f.label} className="flex items-center gap-3 text-xs">
              <span className="w-36 shrink-0 text-muted">{f.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.min(100, (f.contribution / 26) * 100)}%` }}
                />
              </div>
              <span className="w-6 text-right text-muted">{f.contribution}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function describeScore(wish: WishScore): string {
  switch (wish.label) {
    case "Calm":
      return "Mild conditions all around. Nothing to plan around today.";
    case "Breezy":
      return "A little wind or moisture in the mix, but nothing disruptive.";
    case "Active":
      return "Noticeable wind, rain, or temperature swings — worth a glance before heading out.";
    case "Rough":
      return "Conditions are turning unpleasant. Expect wind, precipitation, or extreme temps.";
    default:
      return "Significant weather in play. Check alerts and plan accordingly.";
  }
}
