"use client";

import { useEffect, useRef, useState } from "react";
import type { CameraRow } from "@/lib/db";
import { isDirectVideoSource, isYouTubeEmbedUrl, isHazcamsUrl, postYouTubeCommand } from "@/lib/camera-utils";

export type CameraDragData =
  | { type: "slot"; slot: number }
  | { type: "camera"; cameraId: number };

// An overlay (loading/buffering) must stay up for at least this long once it
// turns on, even if the feed is actually ready sooner — avoids a jarring
// flash on fast connections. If the underlying condition is still true past
// this, the overlay just keeps showing until it clears.
const OVERLAY_MIN_MS = 2000;

// `episode` identifies *which* loading attempt `active` refers to (e.g. the
// tile's loadToken). Without it, a slot that sits empty for a while — where
// `active` is vacuously true the whole time, just unrendered — would never
// see `active` actually flip false→true when a camera finally lands in it,
// so the effect below would never re-arm and the stale, long-elapsed start
// time would let the overlay skip its minimum straight away. Keying off the
// episode as well means every new attempt (a reassigned camera, a manual
// refresh) gets its own fresh clock even if `active` was already true.
function useMinDisplay(active: boolean, minMs: number, episode: string | number): boolean {
  const [visible, setVisible] = useState(active);
  const shownAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    function show() {
      shownAtRef.current = Date.now();
      setVisible(true);
    }
    function hideOnceMinimumElapsed() {
      if (shownAtRef.current == null) {
        setVisible(false);
        return;
      }
      const remaining = minMs - (Date.now() - shownAtRef.current);
      if (remaining <= 0) {
        shownAtRef.current = null;
        setVisible(false);
      } else {
        timerRef.current = window.setTimeout(() => {
          shownAtRef.current = null;
          setVisible(false);
        }, remaining);
      }
    }

    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (active) {
      show();
    } else {
      hideOnceMinimumElapsed();
    }

    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, [active, minMs, episode]);

  return visible;
}

// All three states share the same badge-in-a-circle chrome so they read as
// one consistent visual language. Offline gets a static camera-off glyph in
// a danger-tinted circle — it's a dead state, nothing about it should
// animate. Loading/buffering get a camera glyph with a scanning ring
// orbiting it (like a viewfinder focusing) plus a radar-ping halo, which
// reads as more "this device is actively working" than a generic spinner.
// The scrim is a flat, fairly light tint (no blur) — it needs to actually
// read as translucent instead of blacking the tile out.
function CameraOverlay({ variant, offlineLabel }: { variant: "loading" | "buffering" | "offline"; offlineLabel?: string }) {
  const isOffline = variant === "offline";
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/35">
      <div className="relative flex h-14 w-14 items-center justify-center">
        {!isOffline && <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />}
        <div
          className={`absolute inset-0 rounded-full ${isOffline ? "bg-danger/15 ring-1 ring-danger/50" : "bg-accent/15 ring-1 ring-accent/40"}`}
        />
        {!isOffline && (
          <svg className="absolute inset-0 h-full w-full animate-spin text-accent-2" viewBox="0 0 56 56" fill="none">
            <circle
              cx="28"
              cy="28"
              r="24"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="26 125"
            />
          </svg>
        )}
        {isOffline ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="relative text-danger">
            <rect x="2" y="6" width="14" height="12" rx="2" />
            <path d="m22 8-6 4 6 4V8Z" />
            <path d="M2 2l20 20" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="relative text-accent-2">
            <rect x="2" y="6" width="14" height="12" rx="2" />
            <path d="m22 8-6 4 6 4V8Z" />
          </svg>
        )}
      </div>
      {isOffline ? (
        <span className="px-2 text-center text-xs font-medium text-danger">{offlineLabel}</span>
      ) : (
        <span className="flex items-center gap-1 px-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted">
          Buffering
          <span className="flex items-end gap-0.5">
            <span className="h-1 w-1 animate-bounce rounded-full bg-muted" style={{ animationDelay: "0ms" }} />
            <span className="h-1 w-1 animate-bounce rounded-full bg-muted" style={{ animationDelay: "150ms" }} />
            <span className="h-1 w-1 animate-bounce rounded-full bg-muted" style={{ animationDelay: "300ms" }} />
          </span>
        </span>
      )}
    </div>
  );
}

// hazcams.com's station pages always render their mobile/narrow layout
// under their ~768px breakpoint (true for every tile size in this grid), so
// their header bar (back/settings/share/name/viewer count, ~60px) and bottom
// HUD (wind-direction readout + watermark, ~44px) are fixed pixel bands
// against a 600x338 (16:9) render — measured directly against their page.
// Rendering the iframe at that fixed reference size, cropping out those two
// bands with a calibrated zoom, then scaling the clean result to cover
// whatever shape the actual tile is (mirroring the object-fit: cover used
// for direct video sources) is the only way to hide chrome hazcams.com
// doesn't offer an embed mode or raw stream URL to bypass — see
// isHazcamsUrl in lib/camera-utils.ts.
const HAZCAMS_REF_WIDTH = 600;
const HAZCAMS_REF_HEIGHT = 338;
const HAZCAMS_CROP_SCALE = 1.55;
const HAZCAMS_CROP_TRANSLATE_X = -(HAZCAMS_REF_WIDTH * (HAZCAMS_CROP_SCALE - 1)) / 2;
const HAZCAMS_CROP_TRANSLATE_Y = -60 * HAZCAMS_CROP_SCALE;

// Exported so any other spot embedding a hazcams.com source (e.g. the admin
// table's hover preview) renders it identically to a grid tile, instead of
// showing their raw chrome in one place and a cropped feed in another.
export function HazcamsFrame({ src, onLoad }: { src: string; onLoad?: () => void }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setFitScale(Math.max(width / HAZCAMS_REF_WIDTH, height / HAZCAMS_REF_HEIGHT));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden">
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: HAZCAMS_REF_WIDTH,
          height: HAZCAMS_REF_HEIGHT,
          overflow: "hidden",
          transformOrigin: "center",
          transform: `translate(-50%, -50%) scale(${fitScale})`,
        }}
      >
        <iframe
          src={src}
          scrolling="no"
          onLoad={onLoad}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: HAZCAMS_REF_WIDTH,
            height: HAZCAMS_REF_HEIGHT,
            border: 0,
            transformOrigin: "top left",
            transform: `translate(${HAZCAMS_CROP_TRANSLATE_X}px, ${HAZCAMS_CROP_TRANSLATE_Y}px) scale(${HAZCAMS_CROP_SCALE})`,
          }}
        />
      </div>
    </div>
  );
}

export function CameraTile({
  camera,
  area,
  slot,
  active,
  pending = false,
  isDragOver = false,
  isBeingDragged = false,
  onClick,
  onDragStart,
  onRemove,
}: {
  camera: CameraRow | null;
  area: string;
  slot: number;
  active: boolean;
  pending?: boolean;
  // True while a drag in progress is currently hovering this tile.
  isDragOver?: boolean;
  // True while this tile's own camera is the thing currently being dragged.
  isBeingDragged?: boolean;
  onClick: () => void;
  // Starts a pointer-based drag of this tile's own camera — see
  // CameraDashboard, which owns the actual drag state and drop handling.
  onDragStart: (e: React.PointerEvent) => void;
  onRemove: (slot: number) => void;
}) {
  const [muted, setMuted] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [streamLoaded, setStreamLoaded] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isOffline = !!camera && camera.is_offline === 1;
  const isDirectVideo = camera ? isDirectVideoSource(camera.source_url) : false;
  const hasAudioLink = !!camera?.audio_url;
  const isYouTubeEmbed = camera ? isYouTubeEmbedUrl(camera.source_url) : false;
  const isHazcams = camera ? isHazcamsUrl(camera.source_url) : false;
  const canMute = !!camera && !isOffline && (isDirectVideo || hasAudioLink || isYouTubeEmbed);
  // An offline camera's stream never loads for anyone — not even to buffer
  // an initial frame — so no video/audio/iframe element is ever mounted.
  const showStream = !!camera && !pending && !isOffline;

  // Reset the "loaded"/"buffering" flags whenever the stream identity
  // changes — done during render (React's sanctioned pattern for this)
  // rather than an effect, to avoid an extra cascading render.
  const loadToken = `${camera?.source_url ?? ""}-${reloadKey}-${pending}-${isOffline}`;
  const [prevLoadToken, setPrevLoadToken] = useState(loadToken);
  if (loadToken !== prevLoadToken) {
    setPrevLoadToken(loadToken);
    setStreamLoaded(false);
    setBuffering(false);
    // A YouTube embed always reloads muted (baked into its base URL, since
    // autoplay-with-sound isn't allowed) — reset the icon to match, instead
    // of it drifting out of sync with what's actually playing after a
    // refresh or a different camera swapping into this slot. Video/audio
    // sources don't need this: their real .muted keeps working across a
    // reload via the ref, independent of any URL.
    if (isYouTubeEmbed) setMuted(true);
  }

  const showLoadingOverlay = useMinDisplay(!isOffline && (!showStream || !streamLoaded), OVERLAY_MIN_MS, loadToken);
  const showBufferingOverlay =
    useMinDisplay(!isOffline && showStream && streamLoaded && buffering, OVERLAY_MIN_MS, loadToken) &&
    !showLoadingOverlay;

  // Set .muted directly on the media elements (rather than relying solely on
  // the React prop) and explicitly resume playback on unmute — this is the
  // reliable pattern for getting sound to actually start after autoplay was
  // forced to start muted. YouTube gets a real-time postMessage command
  // instead — rewriting its `mute` URL param would force the iframe to
  // reload from scratch every time, which is slow and drops the stream.
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
      if (iframeRef.current && isYouTubeEmbed) {
        postYouTubeCommand(iframeRef.current, next ? "mute" : "unMute");
      }
      return next;
    });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      data-camera-slot={slot}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      onPointerDown={(e) => {
        if (!camera) return;
        // Without capture, a fast drag whose pointer strays over an iframe
        // (a YouTube-embedded tile) hands that iframe the rest of the
        // gesture — the window-level move/up listeners below go silent, so
        // the drag looks "stuck" and never clears until an unrelated click.
        // Capturing on the tile keeps every subsequent event targeted here.
        e.currentTarget.setPointerCapture(e.pointerId);
        onDragStart(e);
      }}
      style={{ gridArea: area }}
      // select-none: a drag gesture that starts over the camera-name badge
      // text would otherwise trigger native text selection instead, which
      // fights the drag — see CameraSidePanel's list item for the same fix.
      className={`group relative min-h-0 select-none overflow-hidden rounded-md border bg-black text-left transition ${
        camera ? "cursor-grab" : "cursor-pointer"
      } ${isBeingDragged ? "opacity-40" : ""} ${
        isDragOver
          ? "border-accent ring-2 ring-accent"
          : active
            ? "border-accent ring-1 ring-accent/40"
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
                // Browsers treat <video> as natively draggable by default —
                // without this, starting our own drag gesture on a tile
                // showing a direct video source can hand the gesture off to
                // the browser's native HTML5 drag instead, which never fires
                // the pointerup our drag logic is waiting on.
                draggable={false}
                onLoadedData={() => setStreamLoaded(true)}
                onWaiting={() => setBuffering(true)}
                // Buffering is cleared on whichever of these fires first —
                // relying on `playing` alone missed cases in some browsers
                // (e.g. a `loop` restart that never emits a clean `playing`
                // after its `waiting`), which is what made the overlay feel
                // unreliable.
                onPlaying={() => setBuffering(false)}
                onCanPlay={() => setBuffering(false)}
                onTimeUpdate={() => setBuffering(false)}
                // A translucent overlay only hides raw, in-progress frames if
                // there's nothing underneath to peek through — so the video
                // itself stays invisible (still loading normally, just not
                // painted) until the loading overlay actually clears, then
                // crossfades in with it.
                className={`h-full w-full object-cover transition-opacity duration-300 ${
                  showLoadingOverlay ? "opacity-0" : "opacity-100"
                }`}
              />
            ) : isHazcams ? (
              <div
                key={`${camera.source_url}-${reloadKey}`}
                className={`h-full w-full transition-opacity duration-300 ${
                  showLoadingOverlay ? "opacity-0" : "opacity-100"
                }`}
              >
                <HazcamsFrame src={camera.source_url} onLoad={() => setStreamLoaded(true)} />
              </div>
            ) : (
              <iframe
                key={`${camera.source_url}-${reloadKey}`}
                ref={iframeRef}
                src={camera.source_url}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                onLoad={() => setStreamLoaded(true)}
                // No hover/click interactivity of its own — the tile's own
                // buttons (mute, refresh, remove) are the only controls;
                // clicks pass through to select this tile like everywhere else.
                // Stays invisible (still loading normally underneath) until
                // the loading overlay clears — otherwise YouTube's own
                // loading chrome shows through the translucent overlay.
                className={`pointer-events-none h-full w-full border-0 transition-opacity duration-300 ${
                  showLoadingOverlay ? "opacity-0" : "opacity-100"
                }`}
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

          {isOffline ? (
            <CameraOverlay variant="offline" offlineLabel={`${camera.name} · Offline`} />
          ) : showLoadingOverlay ? (
            <CameraOverlay variant="loading" />
          ) : (
            showBufferingOverlay && <CameraOverlay variant="buffering" />
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2">
            <span className="rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
              {camera.name}
            </span>
            <div className="pointer-events-auto flex items-center gap-1">
              {canMute && (
                <button
                  type="button"
                  onClick={toggleMute}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="rounded-md bg-black/60 p-1 text-white opacity-0 transition hover:bg-accent/80 group-hover:opacity-100"
                >
                  {muted ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                      <path d="m23 9-6 6M17 9l6 6" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                      <path d="M16.5 8.5a5 5 0 0 1 0 7M19.5 5.5a9 9 0 0 1 0 13" />
                    </svg>
                  )}
                </button>
              )}
              {!isOffline && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReloadKey((k) => k + 1);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Refresh camera feed"
                  className="rounded-md bg-black/60 p-1 text-white opacity-0 transition hover:bg-accent/80 group-hover:opacity-100"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M23 4v6h-6M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(slot);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Remove camera from slot"
                className="rounded-md bg-black/60 p-1 text-white opacity-0 transition hover:bg-danger/80 group-hover:opacity-100"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </>
      ) : (
        <div
          className={`flex h-full w-full flex-col items-center justify-center gap-1 text-muted ${
            isDragOver ? "text-accent" : ""
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="6" width="14" height="12" rx="2" />
            <path d="m22 8-6 4 6 4V8Z" />
          </svg>
          <span className="text-xs">{isDragOver ? "Drop to assign" : "Select a camera"}</span>
        </div>
      )}
    </div>
  );
}
