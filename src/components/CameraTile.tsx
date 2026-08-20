"use client";

import { useRef, useState } from "react";
import type { CameraRow } from "@/lib/db";
import { isDirectVideoSource } from "@/lib/camera-utils";

export type CameraDragData =
  | { type: "slot"; slot: number }
  | { type: "camera"; cameraId: number };

export function CameraTile({
  camera,
  area,
  slot,
  active,
  pending = false,
  onClick,
  onDropCamera,
  onSwapSlots,
  onRemove,
}: {
  camera: CameraRow | null;
  area: string;
  slot: number;
  active: boolean;
  pending?: boolean;
  onClick: () => void;
  onDropCamera: (slot: number, cameraId: number) => void;
  onSwapSlots: (fromSlot: number, toSlot: number) => void;
  onRemove: (slot: number) => void;
}) {
  const [muted, setMuted] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [streamLoaded, setStreamLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isDirectVideo = camera ? isDirectVideoSource(camera.source_url) : false;
  const hasAudioLink = !!camera?.audio_url;
  const canMute = !!camera && (isDirectVideo || hasAudioLink);
  const showStream = !!camera && !pending;

  // Reset the "loaded" flag whenever the stream identity changes — done
  // during render (React's sanctioned pattern for this) rather than an
  // effect, to avoid an extra cascading render.
  const loadToken = `${camera?.source_url ?? ""}-${reloadKey}-${pending}`;
  const [prevLoadToken, setPrevLoadToken] = useState(loadToken);
  if (loadToken !== prevLoadToken) {
    setPrevLoadToken(loadToken);
    setStreamLoaded(false);
  }

  // Set .muted directly on the media elements (rather than relying solely on
  // the React prop) and explicitly resume playback on unmute — this is the
  // reliable pattern for getting sound to actually start after autoplay was
  // forced to start muted.
  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    setMuted((prev) => {
      const next = !prev;
      if (videoRef.current) {
        videoRef.current.muted = next;
        if (!next) videoRef.current.play().catch(() => {});
      }
      if (audioRef.current) {
        audioRef.current.muted = next;
        if (!next) audioRef.current.play().catch(() => {});
      }
      return next;
    });
  }

  function handleDragStart(e: React.DragEvent) {
    if (!camera) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify({ type: "slot", slot }));
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    let data: CameraDragData;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    if (data.type === "slot") {
      onSwapSlots(data.slot, slot);
    } else if (data.type === "camera") {
      onDropCamera(slot, data.cameraId);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      draggable={!!camera}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{ gridArea: area }}
      className={`group relative min-h-0 cursor-pointer overflow-hidden rounded-xl border bg-black text-left transition ${
        dragOver
          ? "border-accent ring-2 ring-accent"
          : active
            ? "border-accent ring-2 ring-accent/40"
            : "border-border/60 hover:border-accent/50"
      }`}
    >
      {camera ? (
        <>
          {showStream &&
            (isDirectVideo ? (
              <video
                key={`${camera.source_url}-${reloadKey}`}
                ref={videoRef}
                src={camera.source_url}
                autoPlay
                loop
                muted={muted}
                playsInline
                onLoadedData={() => setStreamLoaded(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <iframe
                key={`${camera.source_url}-${reloadKey}`}
                src={camera.source_url}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                onLoad={() => setStreamLoaded(true)}
                className="h-full w-full border-0"
              />
            ))}

          {showStream && hasAudioLink && (
            <audio
              key={`${camera.audio_url}-${reloadKey}`}
              ref={audioRef}
              src={camera.audio_url ?? undefined}
              autoPlay
              loop
              muted={muted}
            />
          )}

          {(!showStream || !streamLoaded) && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
              <svg
                className="h-5 w-5 animate-spin text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="3" opacity="0.25" />
                <path d="M22 12a10 10 0 0 0-10-10" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span className="text-xs text-muted">{camera.name}</span>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2">
            <span className="rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
              {camera.name}
            </span>
            <div className="pointer-events-auto flex items-center gap-1">
              {canMute && (
                <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                    <path d="M16.5 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="1.8" fill="none" />
                  </svg>
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReloadKey((k) => k + 1);
                }}
                aria-label="Refresh camera feed"
                className="rounded-md bg-black/60 p-1 text-white opacity-0 transition hover:bg-accent/80 group-hover:opacity-100"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(slot);
                }}
                aria-label="Remove camera from slot"
                className="rounded-md bg-black/60 p-1 text-white opacity-0 transition hover:bg-danger/80 group-hover:opacity-100"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {canMute && (
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="absolute bottom-2 right-2 rounded-md bg-black/60 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
            >
              {muted ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                  <path d="m23 9-6 6M17 9l6 6" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                  <path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 5.5a9 9 0 0 1 0 13" />
                </svg>
              )}
            </button>
          )}
        </>
      ) : (
        <div
          className={`flex h-full w-full flex-col items-center justify-center gap-1 text-muted ${
            dragOver ? "text-accent" : ""
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="6" width="14" height="12" rx="2" />
            <path d="m22 8-6 4 6 4V8Z" />
          </svg>
          <span className="text-xs">{dragOver ? "Drop to assign" : "Select a camera"}</span>
        </div>
      )}
    </div>
  );
}
