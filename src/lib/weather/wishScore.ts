import type { CurrentConditions, DailyPoint, NwsAlert, WishScore } from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// WISH = Weather Intensity Score for Here.
// A 0-100 composite of how "in your face" the current weather is, blending
// wind, precipitation, temperature extremity, visibility, storm activity,
// and any active NWS alerts for the location.
export function computeWishScore(
  current: CurrentConditions,
  today: DailyPoint | undefined,
  alerts: NwsAlert[]
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

  const thunderCodes = new Set([95, 96, 99]);
  const stormScore = thunderCodes.has(current.weatherCode) ? 12 : 0;
  factors.push({ label: "Storm activity", contribution: stormScore });

  let alertScore = 0;
  for (const a of alerts) {
    const sev = a.severity?.toLowerCase();
    if (sev === "extreme") alertScore = Math.max(alertScore, 24);
    else if (sev === "severe") alertScore = Math.max(alertScore, 16);
    else if (sev === "moderate") alertScore = Math.max(alertScore, 8);
    else alertScore = Math.max(alertScore, 4);
  }
  factors.push({ label: "Active alerts", contribution: alertScore });

  const rawTotal = factors.reduce((sum, f) => sum + f.contribution, 0);
  const score = Math.round(clamp(rawTotal, 0, 100));

  let label: string;
  let color: WishScore["color"];
  if (score < 20) {
    label = "Calm";
    color = "good";
  } else if (score < 40) {
    label = "Breezy";
    color = "good";
  } else if (score < 60) {
    label = "Active";
    color = "warn";
  } else if (score < 80) {
    label = "Rough";
    color = "warn";
  } else {
    label = "Severe";
    color = "danger";
  }

  return {
    score,
    label,
    color,
    factors: factors
      .map((f) => ({ ...f, contribution: Math.round(f.contribution) }))
      .sort((a, b) => b.contribution - a.contribution),
  };
}
