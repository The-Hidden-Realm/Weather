"use client";

export function ClockFormatPicker({
  value,
  onChange,
}: {
  value: "12h" | "24h";
  onChange: (next: "12h" | "24h") => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as "12h" | "24h")}
      className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
    >
      <option value="12h">12-hour (1:00 PM)</option>
      <option value="24h">24-hour (13:00)</option>
    </select>
  );
}
