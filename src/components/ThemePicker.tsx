"use client";

export function ThemePicker({
  value,
  onChange,
}: {
  value: "dark" | "light";
  onChange: (next: "dark" | "light") => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as "dark" | "light")}
      className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
    >
      <option value="dark">Dark</option>
      <option value="light">Light</option>
    </select>
  );
}
