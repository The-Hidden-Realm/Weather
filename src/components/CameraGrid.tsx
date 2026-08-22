"use client";

import { useEffect, useRef, useState } from "react";
import type { CameraRow } from "@/lib/db";
import { CameraTile } from "@/components/CameraTile";
import { CAMERA_LAYOUTS, CAMERA_LAYOUT_MODES, type CameraLayoutMode } from "@/lib/camera-utils";

// Stagger tile stream start-up so all feeds aren't fighting for bandwidth and
// connections the instant the page loads — the primary tile starts
// immediately, the rest follow shortly after.
const STAGGER_MS = 200;

function LayoutModeSelect({
  value,
  onChange,
}: {
  value: CameraLayoutMode;
  onChange: (mode: CameraLayoutMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted transition hover:border-accent hover:text-foreground"
      >
        {CAMERA_LAYOUTS[value].label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 w-28 overflow-hidden rounded-md border border-border bg-surface-2 shadow-xl"
        >
          {CAMERA_LAYOUT_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              role="option"
              aria-selected={value === mode}
              onClick={() => {
                onChange(mode);
                setOpen(false);
              }}
              className={`block w-full px-3 py-1.5 text-left text-xs transition hover:bg-accent/10 ${
                value === mode ? "text-accent-2" : "text-foreground"
              }`}
            >
              {CAMERA_LAYOUTS[mode].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CameraGrid({
  layout,
  camerasById,
  layoutMode,
  onLayoutModeChange,
  selectedSlot,
  onSelectSlot,
  isFullscreen,
  onToggleFullscreen,
  panelOpen,
  onTogglePanel,
  dragOverSlot,
  draggingSlot,
  onTileDragStart,
  onRemoveSlot,
}: {
  layout: (number | null)[];
  camerasById: Map<number, CameraRow>;
  layoutMode: CameraLayoutMode;
  onLayoutModeChange: (mode: CameraLayoutMode) => void;
  selectedSlot: number;
  onSelectSlot: (slot: number) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
  // Which slot a drag in progress is currently hovering, if any.
  dragOverSlot: number | null;
  // Which slot's own camera is the thing currently being dragged, if any.
  draggingSlot: number | null;
  onTileDragStart: (slot: number, e: React.PointerEvent) => void;
  onRemoveSlot: (slot: number) => void;
}) {
  const { slotAreas, gridTemplateColumns, gridTemplateRows, gridTemplateAreas } = CAMERA_LAYOUTS[layoutMode];
  const [readySlots, setReadySlots] = useState<boolean[]>(() => new Array(slotAreas.length).fill(false));

  useEffect(() => {
    // Restart the stagger whenever the slot count changes (layout mode
    // switch) so newly-added tiles get their own staggered start too.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReadySlots(new Array(slotAreas.length).fill(false));
    const timers = slotAreas.map((_, i) =>
      window.setTimeout(() => {
        setReadySlots((prev) => {
          if (prev[i]) return prev;
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, i * STAGGER_MS)
    );
    return () => timers.forEach(window.clearTimeout);
    // slotAreas.length is what actually changes tile count; the array
    // identity itself changes every render, so length is the real dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotAreas.length]);

  return (
    <div
      className={`relative flex flex-col rounded-lg border border-border bg-surface/70 p-2.5 ${
        isFullscreen ? "h-full bg-background p-3" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-muted">CCTV view</h2>
          <LayoutModeSelect value={layoutMode} onChange={onLayoutModeChange} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted transition hover:border-accent hover:text-foreground"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isFullscreen ? (
                <path d="M9 3v4a2 2 0 0 1-2 2H3M21 9h-4a2 2 0 0 1-2-2V3M3 15h4a2 2 0 0 1 2 2v4M15 21v-4a2 2 0 0 1 2-2h4" />
              ) : (
                <path d="M3 9V5a2 2 0 0 1 2-2h4M21 9V5a2 2 0 0 0-2-2h-4M3 15v4a2 2 0 0 0 2 2h4M21 15v4a2 2 0 0 1-2 2h-4" />
              )}
            </svg>
            {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          </button>
          {isFullscreen && (
            <button
              type="button"
              onClick={onTogglePanel}
              aria-label={panelOpen ? "Hide camera list" : "Show camera list"}
              aria-pressed={panelOpen}
              className={`flex items-center rounded-md border p-1.5 transition ${
                panelOpen
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border text-muted hover:border-accent hover:text-foreground"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div
        className={`grid flex-1 gap-1.5 ${isFullscreen ? "min-h-0" : "aspect-[16/10]"}`}
        style={{ gridTemplateColumns, gridTemplateRows, gridTemplateAreas }}
      >
        {slotAreas.map((area, slot) => {
          const cameraId = layout[slot];
          const camera = cameraId != null ? camerasById.get(cameraId) ?? null : null;
          return (
            <CameraTile
              key={slot}
              camera={camera}
              area={area}
              slot={slot}
              active={selectedSlot === slot}
              pending={!readySlots[slot]}
              isDragOver={dragOverSlot === slot}
              isBeingDragged={draggingSlot === slot}
              onClick={() => onSelectSlot(slot)}
              onDragStart={(e) => onTileDragStart(slot, e)}
              onRemove={onRemoveSlot}
            />
          );
        })}
      </div>
    </div>
  );
}
