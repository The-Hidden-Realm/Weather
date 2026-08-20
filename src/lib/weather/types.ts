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
  pressure: number;
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
  score: number; // 0-100
  label: string;
  color: "good" | "warn" | "danger";
  factors: { label: string; contribution: number }[];
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
