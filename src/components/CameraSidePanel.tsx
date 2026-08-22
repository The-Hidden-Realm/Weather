"use client";

import { useEffect, useRef, useState } from "react";
import type { CameraRow } from "@/lib/db";
import { isDirectVideoSource } from "@/lib/camera-utils";

const PREVIEW_HOVER_DELAY = 250;
const PREVIEW_WIDTH = 220;
const PREVIEW_HEIGHT = 160;

type PreviewState = { camera: CameraRow; top: number; left: number };

export function CameraSidePanel({
  cameras,
  categories,
  isAdmin,
  draggingCameraId,
  onClose,
  onPickCamera,
  onDragCameraStart,
  onAddCamera,
  onEditCamera,
  onDeleteCamera,
  maxHeight,
}: {
  cameras: CameraRow[];
  categories: string[];
  isAdmin: boolean;
  // Which camera (if any) is currently being dragged out of this list.
  draggingCameraId: number | null;
  onClose?: () => void;
  onPickCamera: (camera: CameraRow) => void;
  // Starts a pointer-based drag of this camera toward a grid slot — see
  // CameraDashboard, which owns the actual drag state and drop handling.
  onDragCameraStart: (cameraId: number, e: React.PointerEvent) => void;
  onAddCamera: () => void;
  onEditCamera: (camera: CameraRow) => void;
  onDeleteCamera: (camera: CameraRow) => void;
  maxHeight?: number;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const categoryRef = useRef<HTMLDivElement>(null);

  // The preview only mounts a live video/iframe for the camera actually being
  // hovered — and only after a short delay — so scrolling past the list
  // doesn't spin up a stream for every row.
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const hoverTimer = useRef<number | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    };
  }, []);

  function schedulePreview(camera: CameraRow, target: HTMLElement) {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      const rect = target.getBoundingClientRect();
      const gap = 8;
      const openLeft = rect.left - PREVIEW_WIDTH - gap >= 0;
      const left = openLeft
        ? rect.left - PREVIEW_WIDTH - gap
        : Math.min(rect.right + gap, window.innerWidth - PREVIEW_WIDTH - gap);
      const top = Math.min(rect.top, window.innerHeight - PREVIEW_HEIGHT - gap);
      setPreview({ camera, top: Math.max(gap, top), left: Math.max(gap, left) });
    }, PREVIEW_HOVER_DELAY);
  }

  function cancelPreview() {
    if (hoverTimer.current) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setPreview(null);
  }

  const needle = search.trim().toLowerCase();
  const filtered = cameras.filter((c) => {
    if (category && c.category !== category) return false;
    if (needle && !c.name.toLowerCase().includes(needle)) return false;
    return true;
  });

  const categoryNeedle = categorySearch.trim().toLowerCase();
  const filteredCategories = categories.filter((c) => c.toLowerCase().includes(categoryNeedle));

  return (
    <div
      style={maxHeight ? { maxHeight } : undefined}
      className="flex w-full max-w-xs shrink-0 flex-col rounded-2xl border border-border bg-surface/70 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">Cameras</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close camera list"
            className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        )}
      </div>

      {isAdmin && (
        <button
          type="button"
          onClick={onAddCamera}
          className="mb-3 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-accent-2 transition hover:border-accent hover:bg-accent/10"
        >
          + Add camera
        </button>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search cameras…"
        className="mb-2 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      />

      <div ref={categoryRef} className="relative mb-3">
        <button
          type="button"
          onClick={() => setCategoryOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-left text-sm text-foreground outline-none focus:border-accent"
        >
          <span>{category || "All categories"}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform ${categoryOpen ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {categoryOpen && (
          <div className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface-2 shadow-xl">
            <div className="sticky top-0 border-b border-border bg-surface-2 p-2">
              <input
                autoFocus
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search categories…"
                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent"
              />
            </div>
            {(!categoryNeedle || "all categories".includes(categoryNeedle)) && (
              <button
                type="button"
                onClick={() => {
                  setCategory("");
                  setCategoryOpen(false);
                  setCategorySearch("");
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-accent/10 ${
                  category === "" ? "text-accent-2" : "text-foreground"
                }`}
              >
                All categories
              </button>
            )}
            {filteredCategories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCategory(c);
                  setCategoryOpen(false);
                  setCategorySearch("");
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-accent/10 ${
                  category === c ? "text-accent-2" : "text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
            {categoryNeedle && filteredCategories.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted">No matching category.</p>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {filtered.length === 0 && <p className="py-4 text-center text-sm text-muted">No cameras found.</p>}
        {filtered.map((camera) => (
          <div
            key={camera.id}
            onPointerDown={(e) => {
              cancelPreview();
              // See CameraTile's onPointerDown for why this matters — without
              // capture, a drag that crosses a grid tile's iframe can get
              // silently handed off to it, leaving the drag stuck.
              e.currentTarget.setPointerCapture(e.pointerId);
              onDragCameraStart(camera.id, e);
            }}
            onMouseEnter={(e) => schedulePreview(camera, e.currentTarget)}
            onMouseLeave={cancelPreview}
            // Without this, a drag gesture that starts on the name/category
            // text triggers the browser's native text-selection instead —
            // it fights the drag (the cursor flips to an I-beam, movement
            // stops registering as a drag) and it's inconsistent because it
            // only kicks in when the pointer happens to land on a text node.
            className={`cursor-grab select-none rounded-xl border border-border/60 bg-surface-2/60 p-2.5 transition hover:border-accent/50 active:cursor-grabbing ${
              draggingCameraId === camera.id ? "opacity-40" : ""
            }`}
          >
            <button type="button" onClick={() => onPickCamera(camera)} className="block w-full text-left">
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                {camera.name}
                {camera.is_offline === 1 && (
                  <span className="rounded bg-danger/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger">
                    Offline
                  </span>
                )}
              </p>
              <p className="text-xs text-muted">
                {camera.category}
                {camera.has_audio === 1 && " · Audio"}
              </p>
            </button>
            {isAdmin && (
              <div className="mt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => onEditCamera(camera)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="text-xs text-accent-2 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteCamera(camera)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="text-xs text-danger hover:underline"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {preview && (
        <div
          className="pointer-events-none fixed z-50 overflow-hidden rounded-lg border border-border bg-black shadow-2xl"
          style={{ top: preview.top, left: preview.left, width: PREVIEW_WIDTH }}
        >
          <div className="aspect-video w-full bg-black">
            {preview.camera.is_offline === 1 ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-black/90">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
                  <rect x="2" y="6" width="14" height="12" rx="2" />
                  <path d="m22 8-6 4 6 4V8Z" />
                  <path d="M2 2l20 20" />
                </svg>
                <span className="text-[11px] font-medium text-danger">Offline</span>
              </div>
            ) : isDirectVideoSource(preview.camera.source_url) ? (
              <video
                key={preview.camera.source_url}
                src={preview.camera.source_url}
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <iframe
                key={preview.camera.source_url}
                src={preview.camera.source_url}
                allow="autoplay"
                className="h-full w-full border-0"
              />
            )}
          </div>
          <p className="truncate bg-surface px-2 py-1 text-xs font-medium text-foreground">{preview.camera.name}</p>
        </div>
      )}
    </div>
  );
}
