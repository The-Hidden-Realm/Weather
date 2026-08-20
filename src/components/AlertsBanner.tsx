import type { NwsAlert } from "@/lib/weather/types";

export function AlertsBanner({ alerts }: { alerts: NwsAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" className="mt-0.5 shrink-0">
            <path d="M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-danger">{a.event}</p>
            <p className="text-xs text-foreground/80">{a.headline}</p>
            <p className="mt-0.5 text-[11px] text-muted">{a.areaDesc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
