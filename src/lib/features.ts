// Feature-flag helpers with no server-only dependencies, so client components
// (AdminUserTable, TopNav) can import them without pulling in better-sqlite3
// via @/lib/auth -> @/lib/db.

export const AVAILABLE_FEATURES = [
  "cameras",
  "weather-alerts",
  "spc-outlooks",
  "hurricane-tracker",
  "storm-prediction",
  "outdoor-activity",
] as const;
export type FeatureKey = (typeof AVAILABLE_FEATURES)[number];

// Which nav surface each feature unlocks, and its display name — shared by
// the admin Features dropdown (so it can label an item "Tools") and TopNav
// (so it knows which group a link belongs to, and whether to show the Tools
// dropdown at all — it's hidden entirely if a user has none of these).
export const FEATURE_META: Record<FeatureKey, { label: string; group: "Navigation" | "Tools" }> = {
  cameras: { label: "Cameras", group: "Navigation" },
  "weather-alerts": { label: "Weather Alerts", group: "Tools" },
  "spc-outlooks": { label: "NWS SPC Outlooks", group: "Tools" },
  "hurricane-tracker": { label: "Hurricane Tracker", group: "Tools" },
  "storm-prediction": { label: "Storm Prediction", group: "Tools" },
  "outdoor-activity": { label: "Outdoor Activity Planning", group: "Tools" },
};

export function getUserFeatures(user: { enabled_features: string }): FeatureKey[] {
  try {
    const parsed = JSON.parse(user.enabled_features || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((f): f is FeatureKey => (AVAILABLE_FEATURES as readonly string[]).includes(f));
  } catch {
    return [];
  }
}
