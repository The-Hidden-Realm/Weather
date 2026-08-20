import type { CurrentConditions, DailyPoint, HourlyPoint, NwsAlert, WishScore } from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Single source of truth for the score bands, shared by the live score
// (below) and the "How to read" explainer modal, so the two can never drift.
export const WISH_BANDS: {
  min: number;
  max: number;
  label: string;
  color: WishScore["color"];
  description: string;
}[] = [
  {
    min: 0,
    max: 19,
    label: "Calm",
    color: "good",
    description: "Mild conditions all around. Nothing to plan around today.",
  },
  {
    min: 20,
    max: 39,
    label: "Breezy",
    color: "good",
    description: "A little wind or moisture in the mix, but nothing disruptive.",
  },
  {
    min: 40,
    max: 59,
    label: "Active",
    color: "warn",
    description: "Noticeable wind, rain, or temperature swings — worth a glance before heading out.",
  },
  {
    min: 60,
    max: 79,
    label: "Rough",
    color: "warn",
    description: "Conditions are turning unpleasant. Expect wind, precipitation, or extreme temps.",
  },
  {
    min: 80,
    max: 100,
    label: "Severe",
    color: "danger",
    description: "Significant weather in play. Check alerts and plan accordingly.",
  },
];

// What feeds the score, in the order they're weighted — shown in the
// "How to read" modal so the number isn't a black box.
export const WISH_FACTOR_INFO: { label: string; description: string }[] = [
  {
    label: "Wind",
    description: "Sustained wind and gusts. Stronger gusts push the score up faster than steady wind.",
  },
  {
    label: "Precipitation",
    description: "How much is falling right now, plus today's chance of more.",
  },
  {
    label: "Temperature extremity",
    description: "How far the “feels like” temperature strays from a comfortable 70°F, hot or cold.",
  },
  {
    label: "Visibility",
    description: "Reduced visibility from fog, haze, or heavy precipitation.",
  },
  {
    label: "Storm activity",
    description:
      "Thunderstorms in the current conditions, or showing up in the forecast for the next few hours — a lead on active weather before an official warning catches up.",
  },
  {
    label: "Active alerts",
    description:
      "National Weather Service watches, warnings, and advisories in effect here. A Warning outweighs a Watch or Advisory at the same severity, matching how NWS itself ranks urgency.",
  },
];

const THUNDER_CODES = new Set([95, 96, 99]);

// How much an alert's product type (Warning vs. Watch vs. Advisory) counts,
// on top of its severity — a Tornado Warning and a Tornado Watch carry very
// different urgency even when NWS tags them with similar severity.
function alertProductWeight(event: string): number {
  const e = event.toLowerCase();
  if (e.includes("warning")) return 1;
  if (e.includes("watch")) return 0.6;
  if (e.includes("advisory") || e.includes("statement")) return 0.35;
  return 0.3;
}

function alertSeverityBase(severity: string | undefined): number {
  switch (severity?.toLowerCase()) {
    case "extreme":
      return 30;
    case "severe":
      return 24;
    case "moderate":
      return 14;
    default:
      return 8;
  }
}

// WIS = Weather Intensity Score.
// A 0-100 composite of how "in your face" the current weather is at this
// location, blending wind, precipitation, temperature extremity, visibility,
// storm activity (current and imminent), and active NWS alerts — weighted by
// product type and severity the same way NWS itself ranks urgency.
export function computeWishScore(
  current: CurrentConditions,
  today: DailyPoint | undefined,
  alerts: NwsAlert[],
  hourly: HourlyPoint[],
  alertsAvailable: boolean
): WishScore {
  const factors: { label: string; contribution: number }[] = [];

  const gust = current.windGust ?? current.windSpeed;
  const windScore = clamp(((gust - 8) / (65 - 8)) * 26, 0, 26);
  factors.push({ label: "Wind", contribution: windScore });

  const precipIntensity = current.precipitation;
  const precipChance = today?.precipitationProbability ?? 0;
  const precipScore = clamp(
    (Math.min(precipIntensity, 12) / 12) * 16 + (precipChance / 100) * 10,
    0,
    26
  );
  factors.push({ label: "Precipitation", contribution: precipScore });

  const comfortableF = 70;
  const tempDelta = Math.abs(current.feelsLike - comfortableF);
  const tempScore = clamp((tempDelta / 45) * 20, 0, 20);
  factors.push({ label: "Temperature extremity", contribution: tempScore });

  const visibilityMiles = current.visibility != null ? current.visibility / 1609.34 : 10;
  const visScore = clamp(((10 - visibilityMiles) / 10) * 12, 0, 12);
  factors.push({ label: "Visibility", contribution: visScore });

  // A storm right now scores higher than one only showing up a couple hours
  // out, but the near-term forecast still counts as an early signal.
  const stormNow = THUNDER_CODES.has(current.weatherCode);
  const stormSoon = hourly.slice(1, 4).some((h) => THUNDER_CODES.has(h.weatherCode));
  const stormScore = stormNow ? 16 : stormSoon ? 10 : 0;
  factors.push({ label: "Storm activity", contribution: stormScore });

  let alertScore = 0;
  for (const a of alerts) {
    const weighted = alertSeverityBase(a.severity) * alertProductWeight(a.event);
    alertScore = Math.max(alertScore, weighted);
  }
  factors.push({ label: "Active alerts", contribution: alertScore });

  const rawTotal = factors.reduce((sum, f) => sum + f.contribution, 0);
  const score = Math.round(clamp(rawTotal, 0, 100));

  const band = WISH_BANDS.find((b) => score >= b.min && score <= b.max) ?? WISH_BANDS[WISH_BANDS.length - 1];
  const label = band.label;
  const color = band.color;

  return {
    score,
    label,
    color,
    factors: factors
      .map((f) => ({ ...f, contribution: Math.round(f.contribution) }))
      .sort((a, b) => b.contribution - a.contribution),
    alertsUnavailable: !alertsAvailable,
  };
}
