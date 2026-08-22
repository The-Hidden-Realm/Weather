// Client-safe camera helpers — kept separate from lib/cameras.ts because that
// module pulls in the (server-only) better-sqlite3 db client.
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|ogv|mov|m3u8)(\?.*)?$/i;

// Fired on `window` whenever the admin camera-controls dialog (Ctrl+Shift+C,
// available from anywhere) changes a camera's offline status or a
// category's privacy — lets any mounted CameraDashboard grid refresh itself
// without the two components needing a direct reference to each other.
export const CAMERA_CATALOG_CHANGED_EVENT = "camera-catalog-changed";

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Powers the admin table's "Export CSV" button — a flat snapshot of the
// whole catalog, not just whatever's currently filtered/searched.
export function camerasToCsv(
  cameras: {
    name: string;
    category: string;
    source_url: string;
    audio_url: string | null;
    has_audio: number;
    is_offline: number;
    created_at: string;
  }[]
): string {
  const header = ["Name", "Category", "Source Link", "Audio Link", "Has Audio", "Offline", "Created At"];
  const rows = cameras.map((c) => [
    c.name,
    c.category,
    c.source_url,
    c.audio_url ?? "",
    c.has_audio ? "Yes" : "No",
    c.is_offline === 1 ? "Yes" : "No",
    c.created_at,
  ]);
  return [header, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n");
}

// RFC4180-ish CSV parsing (handles quoted fields containing commas, quotes,
// or newlines) — the counterpart to camerasToCsv, for the "Import CSV"
// button.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += char;
        i++;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
    } else if (char === ",") {
      row.push(field);
      field = "";
      i++;
    } else if (char === "\r") {
      i++;
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
    } else {
      field += char;
      i++;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export type ImportedCamera = {
  name: string;
  category: string;
  sourceUrl: string;
  audioUrl: string;
  isOffline: boolean;
};

// Matches columns by header name (case-insensitive) rather than fixed
// position, so a file re-saved from Excel/Sheets with reordered columns
// still imports correctly — it only has to keep the same header names
// camerasToCsv writes.
export function parseCamerasCsv(text: string): { cameras: ImportedCamera[]; errors: string[] } {
  const rows = parseCsv(text);
  if (rows.length === 0) return { cameras: [], errors: ["The file is empty."] };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => names.map((n) => header.indexOf(n)).find((i) => i !== -1) ?? -1;
  const nameCol = col("name");
  const categoryCol = col("category");
  const sourceCol = col("source link", "source_url", "source");
  const audioCol = col("audio link", "audio_url", "audio");
  const offlineCol = col("offline");

  if (nameCol === -1 || categoryCol === -1 || sourceCol === -1) {
    return { cameras: [], errors: ["The file needs Name, Category, and Source Link columns."] };
  }

  const cameras: ImportedCamera[] = [];
  const errors: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = (row[nameCol] ?? "").trim();
    const category = (row[categoryCol] ?? "").trim();
    const sourceUrl = (row[sourceCol] ?? "").trim();
    const audioUrl = audioCol !== -1 ? (row[audioCol] ?? "").trim() : "";
    const offlineRaw = offlineCol !== -1 ? (row[offlineCol] ?? "").trim().toLowerCase() : "";
    const isOffline = offlineRaw === "yes" || offlineRaw === "true" || offlineRaw === "1";

    if (!name || !category || !sourceUrl) {
      errors.push(`Row ${i + 1}: missing name, category, or source link — skipped.`);
      continue;
    }
    cameras.push({ name, category, sourceUrl, audioUrl, isOffline });
  }
  return { cameras, errors };
}

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
