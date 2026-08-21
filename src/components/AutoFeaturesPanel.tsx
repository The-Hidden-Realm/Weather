"use client";

import { useEffect, useRef, useState } from "react";
import { AVAILABLE_FEATURES, FEATURE_META, type FeatureKey } from "@/lib/features";

export function AutoFeaturesPanel() {
  const [enabled, setEnabled] = useState<FeatureKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingFeature, setSavingFeature] = useState<FeatureKey | null>(null);
  const [pushing, setPushing] = useState(false);
  // Briefly lights the button green instead of showing a separate message —
  // cleared on the next toggle, push, or after a few seconds.
  const [pushSucceeded, setPushSucceeded] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

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
    setPushSucceeded(false);
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

  async function handlePush() {
    setError(null);
    setPushSucceeded(false);
    setPushing(true);
    try {
      const res = await fetch("/api/admin/settings/auto-features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: enabled }),
      });
      if (!res.ok) throw new Error("Failed to push.");
      setPushSucceeded(true);
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setPushSucceeded(false), 3000);
    } catch {
      setError("Couldn't push features to existing users. Try again.");
    } finally {
      setPushing(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Auto Features</h1>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Features toggled on here are granted automatically to every new signup.
          </p>
          <button
            type="button"
            onClick={handlePush}
            disabled={pushing || loading}
            title="Syncs every existing user's access to match the toggles below — grants what's on, revokes what's off"
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm transition disabled:opacity-60 ${
              pushSucceeded
                ? "border-good/30 bg-good text-white"
                : "border-border bg-surface-2 text-foreground hover:bg-surface"
            }`}
          >
            {pushing ? "Pushing…" : pushSucceeded ? "Pushed ✓" : "Push to existing users"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-border bg-surface/50 p-10 text-center text-sm text-muted">
          Loading…
        </div>
      ) : (
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
      )}
    </div>
  );
}
