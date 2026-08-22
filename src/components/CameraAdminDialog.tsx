"use client";

import { useEffect, useMemo, useState } from "react";
import type { CameraRow } from "@/lib/db";
import { CAMERA_CATALOG_CHANGED_EVENT } from "@/lib/camera-utils";

type CategoryPrivacy = { category: string; isPrivate: boolean };

function ToggleSwitch({
  on,
  onToggle,
  disabled,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition disabled:opacity-60 ${
        on ? "justify-end border-transparent bg-accent" : "justify-start border-border bg-surface-2"
      }`}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow" />
    </button>
  );
}

// Hidden admin shortcut (Ctrl+Shift+C, mirrors the Ctrl+Shift+Enter recovery
// escape hatch on the login page) — mounted globally in TopNav so it's
// reachable from every page. Fetches its own camera catalog on open (it
// doesn't depend on any particular page having already loaded one) and
// broadcasts CAMERA_CATALOG_CHANGED_EVENT after every change so a Cameras
// grid mounted elsewhere can refresh itself.
export function CameraAdminDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<"cameras" | "categories">("cameras");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [cameras, setCameras] = useState<CameraRow[]>([]);
  const [camerasLoading, setCamerasLoading] = useState(true);
  const [camerasError, setCamerasError] = useState<string | null>(null);
  const [categoryPrivacy, setCategoryPrivacy] = useState<CategoryPrivacy[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [savingCameraId, setSavingCameraId] = useState<number | null>(null);
  const [savingCategory, setSavingCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    async function loadCameras() {
      setCamerasLoading(true);
      setCamerasError(null);
      try {
        const res = await fetch("/api/admin/cameras");
        if (!res.ok) throw new Error("Failed to load cameras.");
        const data = await res.json();
        setCameras(data.cameras);
      } catch {
        setCamerasError("Couldn't load cameras.");
      } finally {
        setCamerasLoading(false);
      }
    }
    loadCameras();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    async function loadCategories() {
      setCategoriesLoading(true);
      setCategoriesError(null);
      try {
        const res = await fetch("/api/admin/camera-categories");
        if (!res.ok) throw new Error("Failed to load categories.");
        const data = await res.json();
        setCategoryPrivacy(data.categories);
      } catch {
        setCategoriesError("Couldn't load categories.");
      } finally {
        setCategoriesLoading(false);
      }
    }
    loadCategories();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const categories = useMemo(
    () => [...new Set(cameras.map((c) => c.category))].sort((a, b) => a.localeCompare(b)),
    [cameras]
  );

  const needle = search.trim().toLowerCase();
  const filteredCameras = useMemo(
    () =>
      cameras
        .filter((c) => (categoryFilter ? c.category === categoryFilter : true))
        .filter((c) => (needle ? c.name.toLowerCase().includes(needle) : true))
        .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)),
    [cameras, categoryFilter, needle]
  );

  async function toggleCameraOffline(camera: CameraRow) {
    const nextOffline = camera.is_offline !== 1;
    setSavingCameraId(camera.id);
    setCameras((prev) => prev.map((c) => (c.id === camera.id ? { ...c, is_offline: nextOffline ? 1 : 0 } : c)));
    try {
      const res = await fetch(`/api/admin/cameras/${camera.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOffline: nextOffline }),
      });
      if (!res.ok) throw new Error("Failed to update camera.");
      window.dispatchEvent(new Event(CAMERA_CATALOG_CHANGED_EVENT));
    } catch {
      setCameras((prev) => prev.map((c) => (c.id === camera.id ? camera : c)));
    } finally {
      setSavingCameraId(null);
    }
  }

  async function toggleCategoryPrivate(category: string, wasPrivate: boolean) {
    const nextPrivate = !wasPrivate;
    setSavingCategory(category);
    setCategoryPrivacy((prev) => prev.map((c) => (c.category === category ? { ...c, isPrivate: nextPrivate } : c)));
    try {
      const res = await fetch("/api/admin/camera-categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, isPrivate: nextPrivate }),
      });
      if (!res.ok) throw new Error("Failed to update category.");
      window.dispatchEvent(new Event(CAMERA_CATALOG_CHANGED_EVENT));
    } catch {
      setCategoryPrivacy((prev) => prev.map((c) => (c.category === category ? { ...c, isPrivate: wasPrivate } : c)));
    } finally {
      setSavingCategory(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-5 pb-0">
          <div>
            <p className="text-lg font-semibold text-foreground">Camera controls</p>
            <p className="mb-4 text-xs text-muted">Admin-only · Ctrl+Shift+C</p>
          </div>
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

        <div className="flex gap-1 border-b border-border px-5">
          <button
            type="button"
            onClick={() => setTab("cameras")}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium transition ${
              tab === "cameras" ? "border-b-2 border-accent text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            Cameras
          </button>
          <button
            type="button"
            onClick={() => setTab("categories")}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium transition ${
              tab === "categories" ? "border-b-2 border-accent text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            Categories
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {tab === "cameras" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cameras…"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                >
                  <option value="">All categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {camerasLoading ? (
                <p className="px-1 py-6 text-center text-sm text-muted">Loading cameras…</p>
              ) : camerasError ? (
                <p className="px-1 py-6 text-center text-sm text-danger">{camerasError}</p>
              ) : (
                <div className="divide-y divide-border rounded-xl border border-border">
                  {filteredCameras.length === 0 && (
                    <p className="px-3 py-6 text-center text-sm text-muted">No cameras found.</p>
                  )}
                  {filteredCameras.map((camera) => (
                    <div key={camera.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{camera.name}</p>
                        <p className="truncate text-xs text-muted">{camera.category}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`text-xs ${camera.is_offline === 1 ? "text-danger" : "text-muted"}`}>
                          {camera.is_offline === 1 ? "Offline" : "Online"}
                        </span>
                        <ToggleSwitch
                          on={camera.is_offline !== 1}
                          disabled={savingCameraId === camera.id}
                          onToggle={() => toggleCameraOffline(camera)}
                          label={`Toggle ${camera.name} online/offline`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                A private category — and every camera in it — is hidden from everyone except admins.
              </p>
              {categoriesLoading ? (
                <p className="px-1 py-6 text-center text-sm text-muted">Loading categories…</p>
              ) : categoriesError ? (
                <p className="px-1 py-6 text-center text-sm text-danger">{categoriesError}</p>
              ) : (
                <div className="divide-y divide-border rounded-xl border border-border">
                  {categoryPrivacy.length === 0 && (
                    <p className="px-3 py-6 text-center text-sm text-muted">No categories yet.</p>
                  )}
                  {categoryPrivacy.map(({ category, isPrivate }) => (
                    <div key={category} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <p className="truncate text-sm font-medium text-foreground">{category}</p>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`text-xs ${isPrivate ? "text-accent-2" : "text-muted"}`}>
                          {isPrivate ? "Private" : "Public"}
                        </span>
                        <ToggleSwitch
                          on={isPrivate}
                          disabled={savingCategory === category}
                          onToggle={() => toggleCategoryPrivate(category, isPrivate)}
                          label={`Toggle ${category} private/public`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
