"use client";

import { useEffect, useState } from "react";
import type { CameraRow } from "@/lib/db";

export function CameraFormModal({
  camera,
  onClose,
  onSaved,
}: {
  camera: CameraRow | null; // null = creating a new camera
  onClose: () => void;
  onSaved: (camera: CameraRow) => void;
}) {
  const [name, setName] = useState(camera?.name ?? "");
  const [category, setCategory] = useState(camera?.category ?? "");
  const [sourceUrl, setSourceUrl] = useState(camera?.source_url ?? "");
  const [audioUrl, setAudioUrl] = useState(camera?.audio_url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const url = camera ? `/api/admin/cameras/${camera.id}` : "/api/admin/cameras";
      const method = camera ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, sourceUrl, audioUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't save camera.");
        return;
      }
      onSaved(data.camera as CameraRow);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <p className="text-lg font-semibold text-foreground">{camera ? "Edit camera" : "Add camera"}</p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              placeholder="e.g. Storm, Sky, Traffic"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Source link</label>
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              required
              type="url"
              placeholder="https://…"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Audio link <span className="text-muted/70">(optional)</span>
            </label>
            <input
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              type="url"
              placeholder="https://… (leave blank if video has audio, or is silent)"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <p className="mt-1 text-xs text-muted">
              For feeds where audio comes from a separate stream than the video.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-2 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
