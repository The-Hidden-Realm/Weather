"use client";

import { useEffect, useState } from "react";
import type { CameraRow } from "@/lib/db";
import { CameraTile } from "@/components/CameraTile";

const SLOT_AREAS = ["big", "s1", "s2", "s3", "s4", "s5"];
// Stagger tile stream start-up so all 6 feeds aren't fighting for bandwidth
// and connections the instant the page loads — the primary tile starts
// immediately, the rest follow shortly after.
const STAGGER_MS = 200;

export function CameraGrid({
  layout,
  camerasById,
  selectedSlot,
  onSelectSlot,
  isFullscreen,
  onToggleFullscreen,
  panelOpen,
  onTogglePanel,
  onDropCamera,
  onSwapSlots,
  onRemoveSlot,
}: {
  layout: (number | null)[];
  camerasById: Map<number, CameraRow>;
  selectedSlot: number;
  onSelectSlot: (slot: number) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onDropCamera: (slot: number, cameraId: number) => void;
  onSwapSlots: (fromSlot: number, toSlot: number) => void;
  onRemoveSlot: (slot: number) => void;
}) {
  const [readySlots, setReadySlots] = useState<boolean[]>(() => new Array(SLOT_AREAS.length).fill(false));

  useEffect(() => {
    const timers = SLOT_AREAS.map((_, i) =>
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
  }, []);

  return (
    <div
      className={`relative flex flex-col rounded-2xl border border-border bg-surface/70 p-3 ${
        isFullscreen ? "h-full bg-background p-4" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">CCTV view</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition hover:border-accent hover:text-foreground"
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
              className={`flex items-center rounded-lg border p-1.5 transition ${
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
        className={`grid flex-1 gap-2 ${isFullscreen ? "min-h-0" : "aspect-[16/10]"}`}
        style={{
          gridTemplateColumns: "repeat(3, 1fr)",
          gridTemplateRows: "repeat(3, 1fr)",
          gridTemplateAreas: '"big big s1" "big big s2" "s3 s4 s5"',
        }}
      >
        {SLOT_AREAS.map((area, slot) => {
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
              onClick={() => onSelectSlot(slot)}
              onDropCamera={onDropCamera}
              onSwapSlots={onSwapSlots}
              onRemove={onRemoveSlot}
            />
          );
        })}
      </div>
    </div>
  );
}
