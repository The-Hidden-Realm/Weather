// Client-safe camera helpers — kept separate from lib/cameras.ts because that
// module pulls in the (server-only) better-sqlite3 db client.
const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|ogv|mov|m3u8)(\?.*)?$/i;

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
  return embed.toString();
}
