import type { SpcDayOutlook, SpcOutlooksPayload } from "./types";

const BASE = "https://www.spc.noaa.gov/products/outlook";
const USER_AGENT = "(weather-tracker-app, contact: set CONTACT_EMAIL env var)";

function userAgent(): string {
  return process.env.CONTACT_EMAIL ? `(weather-tracker-app, ${process.env.CONTACT_EMAIL})` : USER_AGENT;
}

// SPC's HTML/text products aren't proxied through us (images are linked
// straight to spc.noaa.gov from the client) — only these small requests hit
// our server, so `revalidate` is what actually enforces the 15-minute
// cadence for everyone polling at once. Admin's manual refresh bypasses it.
function fetchInit(force: boolean): RequestInit {
  return {
    headers: { "User-Agent": userAgent() },
    ...(force ? { cache: "no-store" as const } : { next: { revalidate: 900 } }),
  };
}

// The print-friendly page embeds static image filenames stamped with the
// current issuance time (e.g. "day1otlk_1630_prt.png") — that time code
// changes every time SPC re-issues the outlook, so it has to be scraped
// fresh rather than assumed.
function extractIssuedCode(html: string, day: 1 | 2 | 3): string | null {
  const match = html.match(new RegExp(`day${day}otlk_(\\d{3,4})_prt\\.html`));
  return match ? match[1] : null;
}

// `code` is HHMM UTC with no date attached (SPC's own convention — its
// products are always timestamped in Zulu time). Paired with today's UTC
// calendar date, since we scrape it live rather than caching stale issuances
// across a day boundary.
function issuedCodeToInstant(code: string): string {
  const padded = code.padStart(4, "0");
  const hour = Number(padded.slice(0, 2));
  const minute = Number(padded.slice(2, 4));
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute)).toISOString();
}

async function fetchDayOutlook(day: 1 | 2 | 3, force: boolean): Promise<SpcDayOutlook> {
  const empty: SpcDayOutlook = {
    day,
    issued: null,
    issuedAt: null,
    categoricalImageUrl: null,
    tornadoImageUrl: null,
    windImageUrl: null,
    hailImageUrl: null,
    probabilisticImageUrl: null,
    discussion: "",
    ok: false,
  };

  try {
    const [htmlRes, txtRes] = await Promise.all([
      fetch(`${BASE}/day${day}otlk.html`, fetchInit(force)),
      fetch(`${BASE}/day${day}otlk.txt`, fetchInit(force)),
    ]);

    if (!htmlRes.ok) return empty;
    const html = await htmlRes.text();
    const issued = extractIssuedCode(html, day);
    if (!issued) return empty;

    const discussion = txtRes.ok ? await txtRes.text() : "";
    const issuedAt = issuedCodeToInstant(issued);

    if (day === 3) {
      return {
        day,
        issued,
        issuedAt,
        categoricalImageUrl: `${BASE}/day3otlk_${issued}_prt.png`,
        tornadoImageUrl: null,
        windImageUrl: null,
        hailImageUrl: null,
        probabilisticImageUrl: `${BASE}/day3prob_${issued}_prt.png`,
        discussion,
        ok: true,
      };
    }

    return {
      day,
      issued,
      issuedAt,
      categoricalImageUrl: `${BASE}/day${day}otlk_${issued}_prt.png`,
      tornadoImageUrl: `${BASE}/day${day}probotlk_${issued}_torn_prt.png`,
      windImageUrl: `${BASE}/day${day}probotlk_${issued}_wind_prt.png`,
      hailImageUrl: `${BASE}/day${day}probotlk_${issued}_hail_prt.png`,
      probabilisticImageUrl: null,
      discussion,
      ok: true,
    };
  } catch {
    // SPC outage/network failure: fail soft, other days still stand on their own.
    return empty;
  }
}

export async function fetchSpcOutlooks(opts?: { force?: boolean }): Promise<SpcOutlooksPayload> {
  const force = opts?.force ?? false;
  const days = await Promise.all([1, 2, 3].map((d) => fetchDayOutlook(d as 1 | 2 | 3, force)));
  return { days, fetchedAt: new Date().toISOString() };
}
