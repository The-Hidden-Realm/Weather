"use client";

import { useEffect, useState } from "react";
import { AVAILABLE_FEATURES, FEATURE_META, type FeatureKey } from "@/lib/features";

export function AutoFeaturesPanel() {
  const [enabled, setEnabled] = useState<FeatureKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingFeature, setSavingFeature] = useState<FeatureKey | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/settings/auto-features");
        if (!res.ok) throw new Error("Failed to load settings.");
        const data = await res.json();
        setEnabled(data.features);
      } catch {
        setError("Couldn't load auto-approve settings. Try refreshing the page.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function toggleFeature(feature: FeatureKey) {
    setError(null);
    const next = enabled.includes(feature) ? enabled.filter((f) => f !== feature) : [...enabled, feature];
    const previous = enabled;
    setEnabled(next);
    setSavingFeature(feature);
    try {
      const res = await fetch("/api/admin/settings/auto-features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: next }),
      });
      if (!res.ok) throw new Error("Failed to save.");
    } catch {
      setEnabled(previous);
      setError("Couldn't save that change. Try again.");
    } finally {
      setSavingFeature(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface/50 p-10 text-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="divide-y divide-border rounded-2xl border border-border bg-surface/70">
        {AVAILABLE_FEATURES.map((feature) => {
          const on = enabled.includes(feature);
          return (
            <div key={feature} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-sm text-foreground">{FEATURE_META[feature].label}</p>
                <p className="text-xs text-muted">{FEATURE_META[feature].group}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                disabled={savingFeature === feature}
                onClick={() => toggleFeature(feature)}
                className={`flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition disabled:opacity-60 ${
                  on ? "justify-end border-transparent bg-accent" : "justify-start border-border bg-surface-2"
                }`}
              >
                <span className="h-5 w-5 rounded-full bg-white shadow" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
