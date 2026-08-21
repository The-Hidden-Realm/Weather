"use client";

import { useEffect, useState } from "react";

export function AdminRecoveryKeyPanel() {
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/settings/recovery-key");
        if (!res.ok) throw new Error("Failed to load settings.");
        const data = await res.json();
        setConfigured(data.configured);
      } catch {
        setError("Couldn't load recovery key status. Try refreshing the page.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function save(nextKey: string) {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/recovery-key", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: nextKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't save the recovery key.");
        return;
      }
      setConfigured(data.configured);
      setKey("");
      setSuccess(data.configured ? "Recovery key saved." : "Recovery key removed.");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
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
      <div className="rounded-2xl border border-border bg-surface/70 p-5">
        <p className="text-sm text-foreground">
          Status:{" "}
          {configured ? <span className="text-good">Configured</span> : <span className="text-muted">Not set</span>}
        </p>
        <p className="mt-1 text-xs text-muted">
          On the sign-in page, pressing Ctrl+Shift+Enter opens a hidden prompt for this key. Anyone who enters it
          correctly can set a new password for the admin account, without needing to already be signed in — so
          treat it like a second admin password.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(key);
          }}
          className="mt-4 space-y-3"
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              {configured ? "Replace recovery key" : "Set recovery key"}
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full max-w-sm rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-good/30 bg-good/10 px-3 py-2 text-sm text-good">
              {success}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !key}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-2 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save key"}
            </button>
            {configured && (
              <button
                type="button"
                disabled={saving}
                onClick={() => save("")}
                className="rounded-lg border border-danger/30 px-4 py-2 text-sm text-danger transition hover:bg-danger/10 disabled:opacity-50"
              >
                Remove key
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
