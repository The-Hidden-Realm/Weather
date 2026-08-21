export type CurrentConditions = {
  time: string;
  temperature: number;
  feelsLike: number;
  weatherCode: number;
  isDay: boolean;
  windSpeed: number;
  windDirection: number;
  windGust: number | null;
  humidity: number;
  // Raw station pressure in hPa, uncorrected for elevation — matches what
  // a barometer at this location actually reads.
  pressure: number;
  // Relative to the flat 1013.25 hPa sea-level standard (not adjusted for
  // this location's elevation).
  pressureTrend: "low" | "high";
  visibility: number | null;
  precipitation: number;
  cloudCover: number;
  uvIndex: number | null;
};

export type HourlyPoint = {
  time: string;
  temperature: number;
  feelsLike: number;
  weatherCode: number;
  isDay: boolean;
  precipitationProbability: number;
  precipitation: number;
  windSpeed: number;
  humidity: number;
};

export type DailyPoint = {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  precipitationSum: number;
  windSpeedMax: number;
  windGustMax: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number | null;
};

export type NwsAlert = {
  id: string;
  event: string;
  headline: string;
  description: string;
  instruction: string;
  severity: string;
  urgency: string;
  certainty: string;
  senderName: string;
  areaDesc: string;
  effective: string;
  expires: string;
};

export type WishScore = {
  // 0-100 normally, but uncapped above 100 when label is "Life-Threatening"
  // (an active Tornado Warning or similarly dangerous alert).
  score: number;
  label: string;
  color: "good" | "warn" | "danger";
  factors: { label: string; contribution: number }[];
  // True when the NWS alerts feed failed for this update — the alerts
  // factor was scored as zero for lack of data, not because none are
  // active, so the score may understate real risk.
  alertsUnavailable: boolean;
};

export type WeatherPayload = {
  location: { label: string; lat: number; lon: number; timezone: string };
  current: CurrentConditions;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  alerts: NwsAlert[];
  wish: WishScore;
  sunrise: string;
  sunset: string;
  source: { openMeteo: boolean; nws: boolean };
  fetchedAt: string;
};

export type GeocodeResult = {
  id: number;
  name: string;
  admin1?: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
};
