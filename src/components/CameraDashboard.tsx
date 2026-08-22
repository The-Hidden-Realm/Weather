"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CameraRow } from "@/lib/db";
import { CameraGrid } from "@/components/CameraGrid";
import { CameraSidePanel } from "@/components/CameraSidePanel";
import { CameraFormModal } from "@/components/CameraFormModal";
import type { CameraDragData } from "@/components/CameraTile";
import { CAMERA_LAYOUTS, MAX_CAMERA_SLOTS, type CameraLayoutMode } from "@/lib/camera-utils";

export function CameraDashboard({ isAdmin }: { isAdmin: boolean }) {
  const [cameras, setCameras] = useState<CameraRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [layout, setLayout] = useState<(number | null)[]>(new Array(MAX_CAMERA_SLOTS).fill(null));
  const [layoutMode, setLayoutMode] = useState<CameraLayoutMode>(6);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formCamera, setFormCamera] = useState<CameraRow | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<CameraRow | null>(null);
  // Pointer-based drag-and-drop (not native HTML5 DnD, which doesn't work on
  // touch and is inconsistent across browsers/trackpads) — set on pointerdown
  // over a draggable source, cleared on pointerup anywhere in the window.
  const [dragSource, setDragSource] = useState<CameraDragData | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  // Drives the floating "you're dragging this" preview that follows the
  // cursor — native HTML5 drag gave us that ghost image for free, this is
  // its replacement now that dragging is plain pointer events.
  const [dragPointerPos, setDragPointerPos] = useState<{ x: number; y: number } | null>(null);

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
    if (!dragSource) return;

    // Every grid tile carries data-camera-slot — hit-testing by real screen
    // position (rather than relying on the pointerdown's original target)
    // is what lets this work over an iframe/video tile the same as an empty
    // one, and over touch the same as a mouse.
    function slotAt(x: number, y: number): number | null {
      const el = document.elementFromPoint(x, y);
      const tile = el instanceof Element ? el.closest<HTMLElement>("[data-camera-slot]") : null;
      if (!tile) return null;
      const value = Number(tile.dataset.cameraSlot);
      return Number.isInteger(value) ? value : null;
    }

    function onPointerMove(e: PointerEvent) {
      setDragOverSlot(slotAt(e.clientX, e.clientY));
      setDragPointerPos({ x: e.clientX, y: e.clientY });
    }

    function onPointerUp(e: PointerEvent) {
      const target = slotAt(e.clientX, e.clientY);
      if (target != null && dragSource) {
        if (dragSource.type === "camera") {
          setSelectedSlot(target);
          assignSlot(target, dragSource.cameraId);
        } else if (dragSource.type === "slot" && dragSource.slot !== target) {
          handleSwapSlots(dragSource.slot, target);
        }
      }
      setDragSource(null);
      setDragOverSlot(null);
      setDragPointerPos(null);
    }

    document.body.style.cursor = "grabbing";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    // assignSlot/handleSwapSlots close over `layout`, which doesn't change
    // mid-drag — re-subscribing only when a drag actually starts/ends (not
    // on every dragOverSlot update) is what matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragSource]);

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
        setLayoutMode(layoutData.mode);
      } catch {
        setError("Couldn't load cameras. Try refreshing the page.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const camerasById = useMemo(() => new Map(cameras.map((c) => [c.id, c])), [cameras]);

  const draggedCameraId = dragSource
    ? dragSource.type === "camera"
      ? dragSource.cameraId
      : layout[dragSource.slot]
    : null;
  const draggedCameraName = draggedCameraId != null ? camerasById.get(draggedCameraId)?.name : undefined;

  // Outside fullscreen the list is always visible; in fullscreen it starts
  // collapsed and is toggled via the hamburger button in the grid header.
  const panelOpen = isFullscreen ? fullscreenPanelOpen : true;

  function togglePanel() {
    setFullscreenPanelOpen((o) => !o);
  }

  async function handleLayoutModeChange(mode: CameraLayoutMode) {
    const previous = layoutMode;
    setLayoutMode(mode);
    // The selected slot may not exist in the new mode (e.g. slot 8 while
    // switching from 9-view down to 4-view) — fall back to the first tile.
    const visibleSlots = CAMERA_LAYOUTS[mode].slotAreas.length;
    if (selectedSlot >= visibleSlots) setSelectedSlot(0);
    try {
      const res = await fetch("/api/camera-layout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) throw new Error("Failed to save layout.");
    } catch {
      setLayoutMode(previous);
    }
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
          layoutMode={layoutMode}
          onLayoutModeChange={handleLayoutModeChange}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          panelOpen={panelOpen}
          onTogglePanel={togglePanel}
          dragOverSlot={dragOverSlot}
          draggingSlot={dragSource?.type === "slot" ? dragSource.slot : null}
          onTileDragStart={(slot, e) => {
            setDragSource({ type: "slot", slot });
            setDragPointerPos({ x: e.clientX, y: e.clientY });
          }}
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
          draggingCameraId={dragSource?.type === "camera" ? dragSource.cameraId : null}
          onDragCameraStart={(cameraId, e) => {
            setDragSource({ type: "camera", cameraId });
            setDragPointerPos({ x: e.clientX, y: e.clientY });
          }}
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

      {dragSource && dragPointerPos && (
        <div
          className="pointer-events-none fixed z-50 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-lg border border-accent bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground shadow-2xl"
          style={{ left: dragPointerPos.x, top: dragPointerPos.y }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="6" width="14" height="12" rx="2" />
            <path d="m22 8-6 4 6 4V8Z" />
          </svg>
          {draggedCameraName ?? "Camera"}
        </div>
      )}
    </div>
  );
}
