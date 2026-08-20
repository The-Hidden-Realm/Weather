import { formatTime } from "@/lib/weather/format";

export function LastUpdated({
  fetchedAt,
  timezone,
  isAdmin,
  onRefresh,
  refreshing,
}: {
  fetchedAt: string;
  timezone: string;
  isAdmin: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <span>Last updated {formatTime(fetchedAt, timezone)}</span>
      {isAdmin && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="text-muted underline decoration-dotted underline-offset-2 transition hover:text-foreground disabled:opacity-60"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      )}
    </div>
  );
}
