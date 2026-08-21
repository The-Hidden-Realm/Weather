"use client";

import { useCallback, useEffect, useState } from "react";
import type { SpcDayOutlook, SpcOutlooksPayload } from "@/lib/weather/types";
import { LastUpdated } from "@/components/LastUpdated";
import { SpcDiscussionModal } from "@/components/SpcDiscussionModal";

const DAYS: SpcDayOutlook["day"][] = [1, 2, 3];

type HazardKey = "categorical" | "tornado" | "wind" | "hail" | "probabilistic";

const HAZARDS_STANDARD: { key: HazardKey; label: string }[] = [
  { key: "categorical", label: "Categorical" },
  { key: "tornado", label: "Tornado" },
  { key: "wind", label: "Wind" },
  { key: "hail", label: "Hail" },
];
// Day 3 isn't broken out by hazard upstream — SPC only publishes a
// categorical map and one combined "any severe hazard" probability map.
const HAZARDS_DAY3: { key: HazardKey; label: string }[] = [
  { key: "categorical", label: "Categorical" },
  { key: "probabilistic", label: "Severe Probability" },
];

function hazardImageUrl(day: SpcDayOutlook, hazard: HazardKey): string | null {
  switch (hazard) {
    case "categorical":
      return day.categoricalImageUrl;
    case "tornado":
      return day.tornadoImageUrl;
    case "wind":
      return day.windImageUrl;
    case "hail":
      return day.hailImageUrl;
    case "probabilistic":
      return day.probabilisticImageUrl;
  }
}

function formatIssued(iso: string, timezone: string, hour12: boolean): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
    hour12,
  });
}

// Same :00/:15/:30/:45 window id the main weather dashboard uses, so "is
// this stale" can be answered without re-fetching.
function quarterHourBucket(timezone: string, at: number = Date.now()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const quarter = Math.floor(Number(get("minute")) / 15) * 15;
  return `${get("year")}-${get("month")}-${get("day")}-${get("hour")}-${String(quarter).padStart(2, "0")}`;
}

export function SpcOutlooksView({
  isAdmin,
  timezoneOverride,
  timeFormat = "12h",
}: {
  isAdmin: boolean;
  timezoneOverride?: string | null;
  timeFormat?: "12h" | "24h";
}) {
  const [payload, setPayload] = useState<SpcOutlooksPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True right after an admin's own manual refresh — see LastUpdated.
  const [lastFetchManual, setLastFetchManual] = useState(false);
  const [activeDay, setActiveDay] = useState<1 | 2 | 3>(1);
  const [activeHazard, setActiveHazard] = useState<HazardKey>("categorical");
  const [showDiscussion, setShowDiscussion] = useState(false);

  // No saved location ties this national product to a user, so unlike the
  // dashboard there's nothing to fall back to except UTC — which is also
  // how SPC itself timestamps issuance, so it reads naturally here.
  const timezone = timezoneOverride ?? "UTC";
  const hour12 = timeFormat !== "24h";

  const loadOutlooks = useCallback(async (opts?: { manual?: boolean }) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tools/spc-outlooks${opts?.manual ? "?force=1" : ""}`);
      if (!res.ok) throw new Error("Failed to load SPC outlooks.");
      const data = (await res.json()) as SpcOutlooksPayload;
      setPayload(data);
      setLastFetchManual(opts?.manual ?? false);
      setError(null);
    } catch {
      setError("Couldn't load SPC outlooks. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load only — the scheduler below owns every refresh after this.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOutlooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Auto-refresh aligned to :00/:15/:30/:45 on the clock, same cadence and
    // alignment strategy as the main weather dashboard's scheduler.
    function msUntilNextQuarterHour() {
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(now);
      const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
      const second = Number(parts.find((p) => p.type === "second")?.value ?? 0);
      const minutesUntilNext = 15 - (minute % 15);
      const msUntil = minutesUntilNext * 60_000 - second * 1000 - now.getMilliseconds();
      return msUntil <= 0 ? msUntil + 15 * 60_000 : msUntil;
    }

    let timer: ReturnType<typeof setTimeout>;
    function scheduleNext() {
      timer = setTimeout(() => {
        loadOutlooks();
        scheduleNext();
      }, msUntilNextQuarterHour());
    }
    scheduleNext();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone]);

  useEffect(() => {
    // Backgrounded tabs throttle setTimeout, so catch up the moment the tab
    // is looked at again instead of waiting for the next scheduled tick.
    if (!payload) return;
    function refreshIfStale() {
      if (document.visibilityState !== "visible" || !payload) return;
      const fetchedBucket = quarterHourBucket(timezone, new Date(payload.fetchedAt).getTime());
      if (fetchedBucket !== quarterHourBucket(timezone)) loadOutlooks();
    }
    document.addEventListener("visibilitychange", refreshIfStale);
    window.addEventListener("focus", refreshIfStale);
    return () => {
      document.removeEventListener("visibilitychange", refreshIfStale);
      window.removeEventListener("focus", refreshIfStale);
    };
  }, [payload, timezone, loadOutlooks]);

  function handleManualRefresh() {
    loadOutlooks({ manual: true });
  }

  const day = payload?.days.find((d) => d.day === activeDay) ?? null;
  const hazardOptions = activeDay === 3 ? HAZARDS_DAY3 : HAZARDS_STANDARD;
  // Derived at render time rather than synced via effect: if the day switch
  // leaves the previously-picked hazard unavailable (e.g. "Tornado" while on
  // Day 3), fall back to Categorical without an extra render/state hop.
  const effectiveHazard = hazardOptions.some((h) => h.key === activeHazard) ? activeHazard : "categorical";
  const activeImageUrl = day ? hazardImageUrl(day, effectiveHazard) : null;
  const activeHazardLabel = hazardOptions.find((h) => h.key === effectiveHazard)?.label ?? "Categorical";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">NWS SPC Outlooks</h1>
          <p className="mt-1 text-sm text-muted">
            Categorical, tornado, wind, and hail risk for Day 1 through Day 3, straight from the Storm
            Prediction Center.
          </p>
        </div>

        {payload && (
          <LastUpdated
            fetchedAt={payload.fetchedAt}
            timezone={timezone}
            hour12={hour12}
            exact={lastFetchManual}
            isAdmin={isAdmin}
            onRefresh={handleManualRefresh}
            refreshing={loading}
          />
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
      )}

      {!payload && loading && (
        <div className="rounded-2xl border border-border bg-surface/50 p-10 text-center text-sm text-muted">
          Loading SPC outlooks…
        </div>
      )}

      {day && (
        <div className="space-y-5">
          {!day.ok && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              Couldn&apos;t load Day {day.day} data from SPC. It&apos;ll retry on the next refresh.
            </div>
          )}

          <div className="mx-auto max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setActiveDay(d)}
                  className={`rounded-md px-3 py-1.5 text-sm transition ${
                    activeDay === d ? "bg-accent/15 text-accent-2" : "text-muted hover:text-foreground"
                  }`}
                >
                  Day {d}
                </button>
              ))}

              {day.ok && (
                <>
                  <div className="mx-1 h-5 w-px bg-border" />
                  {hazardOptions.map((h) => (
                    <button
                      key={h.key}
                      type="button"
                      onClick={() => setActiveHazard(h.key)}
                      className={`rounded-md px-3 py-1.5 text-sm transition ${
                        effectiveHazard === h.key
                          ? "bg-accent/15 text-accent-2"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {h.label}
                    </button>
                  ))}

                  {day.discussion && (
                    <button
                      type="button"
                      onClick={() => setShowDiscussion(true)}
                      className="ml-auto rounded-md px-3 py-1.5 text-sm text-muted transition hover:text-foreground"
                    >
                      Discussion
                    </button>
                  )}
                </>
              )}
            </div>

            {day.ok && activeImageUrl && <OutlookMap title={activeHazardLabel} src={activeImageUrl} />}
            {day.ok && day.issuedAt && (
              <p className="mt-2 text-center text-xs text-muted">
                Issued {formatIssued(day.issuedAt, timezone, hour12)}
              </p>
            )}
          </div>
        </div>
      )}

      {day && showDiscussion && (
        <SpcDiscussionModal day={day.day} discussion={day.discussion} onClose={() => setShowDiscussion(false)} />
      )}
    </div>
  );
}

function OutlookMap({ title, src }: { title: string; src: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface/70">
      <h3 className="border-b border-border px-4 py-2 text-sm font-medium text-foreground">{title}</h3>
      {/* External SPC-hosted map image, sized however NOAA publishes it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`${title} outlook map`} className="w-full" />
    </div>
  );
}
