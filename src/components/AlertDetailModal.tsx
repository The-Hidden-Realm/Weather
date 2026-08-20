"use client";

import { useEffect } from "react";
import type { NwsAlert } from "@/lib/weather/types";

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function AlertDetailModal({ alert, onClose }: { alert: NwsAlert; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const details: { label: string; value: string }[] = [
    { label: "Severity", value: alert.severity || "—" },
    { label: "Urgency", value: alert.urgency || "—" },
    { label: "Certainty", value: alert.certainty || "—" },
    { label: "Issued by", value: alert.senderName || "—" },
    { label: "Effective", value: formatDateTime(alert.effective) },
    { label: "Expires", value: formatDateTime(alert.expires) },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-lg font-semibold text-danger">{alert.event}</p>
            <p className="mt-1 text-sm text-foreground/80">{alert.headline}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-border p-5 sm:grid-cols-3">
          {details.map((d) => (
            <div key={d.label} className="rounded-xl border border-border/60 bg-surface-2/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted/80">{d.label}</p>
              <p className="text-sm font-medium text-foreground">{d.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4 p-5">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Area</p>
            <p className="text-sm text-foreground/90">{alert.areaDesc}</p>
          </div>

          {alert.description && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Details</p>
              <p className="whitespace-pre-line text-sm text-foreground/90">{alert.description}</p>
            </div>
          )}

          {alert.instruction && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Instructions</p>
              <p className="whitespace-pre-line text-sm text-foreground/90">{alert.instruction}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
