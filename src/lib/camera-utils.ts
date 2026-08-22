// Client-safe camera helpers — kept separate from lib/cameras.ts because that
// module pulls in the (server-only) better-sqlite3 db client.
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|ogv|mov|m3u8)(\?.*)?$/i;

// How many tiles the CCTV grid shows at once. 1/4/9 are even grids; 6 is a
// spotlight layout (one big tile + five small ones) — the original design.
export const CAMERA_LAYOUT_MODES = [1, 4, 6, 9] as const;
export type CameraLayoutMode = (typeof CAMERA_LAYOUT_MODES)[number];

// The largest layout needs 9 tiles, so every user's saved slot assignments
// array is sized to 9 regardless of their current mode — switching from 9
// down to 4 and back to 9 doesn't lose what was in the higher slots.
export const MAX_CAMERA_SLOTS = 9;

export function isCameraLayoutMode(value: unknown): value is CameraLayoutMode {
  return typeof value === "number" && (CAMERA_LAYOUT_MODES as readonly number[]).includes(value);
}

export type CameraLayoutConfig = {
  label: string;
  // Grid-area name for each slot, in slot-index order.
  slotAreas: string[];
  gridTemplateColumns: string;
  gridTemplateRows: string;
  // Always explicit, even for the even grids — an area name a tile
  // references via `grid-area` has to actually be declared here, or its
  // placement falls back to browser-dependent behavior instead of the cell
  // we intend.
  gridTemplateAreas: string;
};

export const CAMERA_LAYOUTS: Record<CameraLayoutMode, CameraLayoutConfig> = {
  1: {
    label: "1 View",
    slotAreas: ["big"],
    gridTemplateColumns: "1fr",
    gridTemplateRows: "1fr",
    gridTemplateAreas: '"big"',
  },
  4: {
    label: "4 View",
    slotAreas: ["s0", "s1", "s2", "s3"],
    gridTemplateColumns: "repeat(2, 1fr)",
    gridTemplateRows: "repeat(2, 1fr)",
    gridTemplateAreas: '"s0 s1" "s2 s3"',
  },
  6: {
    label: "6 View",
    slotAreas: ["big", "s1", "s2", "s3", "s4", "s5"],
    gridTemplateColumns: "repeat(3, 1fr)",
    gridTemplateRows: "repeat(3, 1fr)",
    gridTemplateAreas: '"big big s1" "big big s2" "s3 s4 s5"',
  },
  9: {
    label: "9 View",
    slotAreas: ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"],
    gridTemplateColumns: "repeat(3, 1fr)",
    gridTemplateRows: "repeat(3, 1fr)",
    gridTemplateAreas: '"s0 s1 s2" "s3 s4 s5" "s6 s7 s8"',
  },
};

export function isDirectVideoSource(url: string): boolean {
  return VIDEO_EXTENSIONS.test(url);
}

// A plain "watch" (or shared youtu.be) link can't be embedded in an <iframe>
// — YouTube refuses it with X-Frame-Options — only /embed/ links work. This
// rewrites whatever YouTube link format someone pastes into that form, and
// turns on autoplay+mute so it behaves like the rest of the grid.
export function normalizeCameraSourceUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  const host = parsed.hostname.replace(/^(www\.|m\.)/, "");
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = parsed.pathname.split("/")[1] || null;
  } else if (host === "youtube.com") {
    if (parsed.pathname === "/watch") {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.pathname.startsWith("/live/")) {
      videoId = parsed.pathname.split("/")[2] || null;
    } else if (parsed.pathname.startsWith("/shorts/")) {
      videoId = parsed.pathname.split("/")[2] || null;
    } else if (parsed.pathname.startsWith("/embed/")) {
      videoId = parsed.pathname.split("/")[2] || null;
    }
  }

  if (!videoId) return url;

  const embed = new URL(`https://www.youtube.com/embed/${videoId}`);
  embed.searchParams.set("autoplay", "1");
  embed.searchParams.set("mute", "1");
  // Strips YouTube's own on-screen player chrome — the tile's own overlay
  // buttons are the only controls, so nothing here should be hoverable or
  // clickable inside the embed itself.
  embed.searchParams.set("controls", "0");
  embed.searchParams.set("disablekb", "1");
  embed.searchParams.set("modestbranding", "1");
  embed.searchParams.set("rel", "0");
  embed.searchParams.set("iv_load_policy", "3");
  embed.searchParams.set("fs", "0");
  // Lets us send it real-time mute/unmute commands via postMessage instead
  // of reloading the whole iframe with a different `mute` param every time.
  embed.searchParams.set("enablejsapi", "1");
  return embed.toString();
}

export function isYouTubeEmbedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^(www\.|m\.)/, "") === "youtube.com" && parsed.pathname.startsWith("/embed/");
  } catch {
    return false;
  }
}

// Sends a command to an embedded YouTube player over postMessage — requires
// `enablejsapi=1` on the embed URL. This is the only way to change an
// already-playing cross-origin YouTube embed's mute state instantly; toggling
// the `mute` URL param instead would force the whole iframe to reload.
export function postYouTubeCommand(iframe: HTMLIFrameElement, func: "mute" | "unMute" | "playVideo") {
  iframe.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "https://www.youtube.com");
}
