"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CameraRow } from "@/lib/db";
import { CameraGrid } from "@/components/CameraGrid";
import { CameraSidePanel } from "@/components/CameraSidePanel";
import { CameraFormModal } from "@/components/CameraFormModal";

const SLOT_COUNT = 6;

export function CameraDashboard({ isAdmin }: { isAdmin: boolean }) {
  const [cameras, setCameras] = useState<CameraRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [layout, setLayout] = useState<(number | null)[]>(new Array(SLOT_COUNT).fill(null));
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formCamera, setFormCamera] = useState<CameraRow | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<CameraRow | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenPanelOpen, setFullscreenPanelOpen] = useState(false);

  // The camera list sits beside the grid on desktop and shouldn't grow past
  // it — cap it to the grid's rendered height and let it scroll internally
  // instead. Only applies at the lg breakpoint, where they're side by side;
  // below that the panel stacks under the grid and should size naturally.
  // A state-backed callback ref (rather than useRef + an effect with empty
  // deps) is needed because the grid doesn't exist in the tree yet on the
  // first render — this component returns a "Loading…" placeholder until
  // the initial fetch resolves — so an effect that only runs once on mount
  // would capture a null ref and never retry.
  const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);
  const [panelMaxHeight, setPanelMaxHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!gridEl) return;

    const mql = window.matchMedia("(min-width: 1024px)");

    function updateHeight() {
      if (!gridEl) return;
      setPanelMaxHeight(mql.matches ? gridEl.getBoundingClientRect().height : undefined);
    }

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(gridEl);
    mql.addEventListener("change", updateHeight);
    updateHeight();

    return () => {
      resizeObserver.disconnect();
      mql.removeEventListener("change", updateHeight);
    };
  }, [gridEl]);

  useEffect(() => {
    function onFullscreenChange() {
      const active = document.fullscreenElement === containerRef.current;
      setIsFullscreen(active);
      // The camera list always starts collapsed on entering fullscreen —
      // it can still be opened via the hamburger button to edit the CCTV.
      if (active) setFullscreenPanelOpen(false);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [camerasRes, layoutRes] = await Promise.all([
          fetch("/api/cameras"),
          fetch("/api/camera-layout"),
        ]);
        if (!camerasRes.ok || !layoutRes.ok) throw new Error("Failed to load cameras.");
        const camerasData = await camerasRes.json();
        const layoutData = await layoutRes.json();
        setCameras(camerasData.cameras);
        setCategories(camerasData.categories);
        setLayout(layoutData.layout);
      } catch {
        setError("Couldn't load cameras. Try refreshing the page.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const camerasById = useMemo(() => new Map(cameras.map((c) => [c.id, c])), [cameras]);

  // Outside fullscreen the list is always visible; in fullscreen it starts
  // collapsed and is toggled via the hamburger button in the grid header.
  const panelOpen = isFullscreen ? fullscreenPanelOpen : true;

  function togglePanel() {
    setFullscreenPanelOpen((o) => !o);
  }

  async function putSlot(slot: number, cameraId: number | null) {
    await fetch("/api/camera-layout", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, cameraId }),
    });
  }

  async function assignSlot(slot: number, cameraId: number | null) {
    setLayout((prev) => {
      const next = [...prev];
      next[slot] = cameraId;
      return next;
    });
    await putSlot(slot, cameraId);
  }

  async function assignCamera(camera: CameraRow) {
    await assignSlot(selectedSlot, camera.id);
  }

  async function handleDropCamera(slot: number, cameraId: number) {
    setSelectedSlot(slot);
    await assignSlot(slot, cameraId);
  }

  async function handleRemoveSlot(slot: number) {
    await assignSlot(slot, null);
  }

  async function handleSwapSlots(fromSlot: number, toSlot: number) {
    if (fromSlot === toSlot) return;
    const fromCameraId = layout[fromSlot];
    const toCameraId = layout[toSlot];
    setLayout((prev) => {
      const next = [...prev];
      next[fromSlot] = toCameraId;
      next[toSlot] = fromCameraId;
      return next;
    });
    await Promise.all([putSlot(fromSlot, toCameraId), putSlot(toSlot, fromCameraId)]);
  }

  function handleSaved(camera: CameraRow) {
    setCameras((prev) => {
      const exists = prev.some((c) => c.id === camera.id);
      const next = exists ? prev.map((c) => (c.id === camera.id ? camera : c)) : [...prev, camera];
      return next.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    });
    setCategories((prev) => (prev.includes(camera.category) ? prev : [...prev, camera.category].sort()));
    setFormCamera(null);
  }

  async function handleDelete(camera: CameraRow) {
    const res = await fetch(`/api/admin/cameras/${camera.id}`, { method: "DELETE" });
    if (res.ok) {
      setCameras((prev) => prev.filter((c) => c.id !== camera.id));
      setLayout((prev) => prev.map((id) => (id === camera.id ? null : id)));
    }
    setDeleteTarget(null);
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface/50 p-10 text-center text-sm text-muted">
        Loading cameras…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-10 text-center text-sm text-danger">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-5 lg:flex-row ${isFullscreen ? "h-screen bg-background p-4" : "lg:items-start"}`}
    >
      <div ref={setGridEl} className="min-w-0 flex-1">
        <CameraGrid
          layout={layout}
          camerasById={camerasById}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          panelOpen={panelOpen}
          onTogglePanel={togglePanel}
          onDropCamera={handleDropCamera}
          onSwapSlots={handleSwapSlots}
          onRemoveSlot={handleRemoveSlot}
        />
      </div>

      {panelOpen && (
        <CameraSidePanel
          cameras={cameras}
          categories={categories}
          isAdmin={isAdmin}
          onClose={isFullscreen ? togglePanel : undefined}
          onPickCamera={assignCamera}
          onAddCamera={() => setFormCamera("new")}
          onEditCamera={(camera) => setFormCamera(camera)}
          onDeleteCamera={(camera) => setDeleteTarget(camera)}
          maxHeight={panelMaxHeight}
        />
      )}

      {formCamera !== null && (
        <CameraFormModal
          camera={formCamera === "new" ? null : formCamera}
          onClose={() => setFormCamera(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-foreground">Delete &ldquo;{deleteTarget.name}&rdquo;?</p>
            <p className="mt-1 text-xs text-muted">
              This removes it from every user&rsquo;s view. This can&rsquo;t be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteTarget)}
                className="rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
