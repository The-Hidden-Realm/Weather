"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionPayload } from "@/lib/session";

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-5">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <p className="mt-0.5 mb-4 text-xs text-muted">{description}</p>
      {children}
    </div>
  );
}

function Message({ text, kind }: { text: string; kind: "error" | "success" }) {
  return (
    <div
      className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
        kind === "error" ? "border-danger/30 bg-danger/10 text-danger" : "border-good/30 bg-good/10 text-good"
      }`}
    >
      {text}
    </div>
  );
}

export function SettingsForm({ session }: { session: SessionPayload }) {
  const router = useRouter();

  // Username, theme, timezone, and clock format are staged locally and only
  // written to the account when the user presses "Save settings" — nothing
  // here should hit the server on its own.
  const [username, setUsername] = useState(session.username);
  const [theme, setTheme] = useState<"dark" | "light">(session.theme);
  const [timezone, setTimezone] = useState(session.timezone ?? "");
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">(session.timeFormat);

  const [savedUsername, setSavedUsername] = useState(username);
  const [savedTheme, setSavedTheme] = useState(theme);
  const [savedTimezone, setSavedTimezone] = useState(timezone);
  const [savedTimeFormat, setSavedTimeFormat] = useState(timeFormat);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; kind: "error" | "success" } | null>(null);
  const dismissTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    };
  }, []);

  const dirty =
    username.trim() !== savedUsername ||
    theme !== savedTheme ||
    timezone !== savedTimezone ||
    timeFormat !== savedTimeFormat;

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), theme, timezone: timezone || null, timeFormat }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMessage({ text: data.error || "Couldn't save settings.", kind: "error" });
        return;
      }
      setUsername(data.username);
      setSavedUsername(data.username);
      setSavedTheme(theme);
      setSavedTimezone(timezone);
      setSavedTimeFormat(timeFormat);
      setSaveMessage({ text: "Settings saved", kind: "success" });
      router.refresh();
      if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
      dismissTimer.current = window.setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage({ text: "Something went wrong. Try again.", kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <UsernameCard value={username} onChange={setUsername} />
      <PasswordCard />
      <ThemeCard value={theme} onChange={setTheme} />
      <TimezoneCard value={timezone} onChange={setTimezone} />
      <ClockFormatCard value={timeFormat} onChange={setTimeFormat} />

      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {saveMessage && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm shadow-lg ${
              saveMessage.kind === "error"
                ? "border-danger/30 bg-danger text-white"
                : "border-good/30 bg-good text-white"
            }`}
          >
            {saveMessage.text}
          </div>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-lg transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}

function UsernameCard({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <Card title="Username" description="This is what shows up as “Logged in as”.">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
    </Card>
  );
}

function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ text: string; kind: "error" | "success" } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirm) {
      setMessage({ text: "Passwords don't match.", kind: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Couldn't update password.", kind: "error" });
        return;
      }
      setMessage({ text: "Password updated.", kind: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch {
      setMessage({ text: "Something went wrong. Try again.", kind: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Password" description="Choose a new password for your account.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          autoComplete="current-password"
        />
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            autoComplete="new-password"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            autoComplete="new-password"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !currentPassword || !newPassword}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-2 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Update password"}
          </button>
        </div>
      </form>
      {message && <Message {...message} />}
    </Card>
  );
}

function ThemeCard({
  value,
  onChange,
}: {
  value: "dark" | "light";
  onChange: (next: "dark" | "light") => void;
}) {
  return (
    <Card title="Appearance" description="Pick how The Hidden Realm Weather looks for your account.">
      <div className="flex gap-3">
        <ThemeOption label="Dark" active={value === "dark"} onClick={() => onChange("dark")}>
          <div className="h-14 w-full rounded-lg border border-border/60 bg-[#0a0e17] p-2">
            <div className="h-2 w-8 rounded-full bg-[#3b82f6]" />
            <div className="mt-2 h-2 w-14 rounded-full bg-[#223049]" />
          </div>
        </ThemeOption>
        <ThemeOption label="Light" active={value === "light"} onClick={() => onChange("light")}>
          <div className="h-14 w-full rounded-lg border border-border/60 bg-[#f4f7fc] p-2">
            <div className="h-2 w-8 rounded-full bg-[#2563eb]" />
            <div className="mt-2 h-2 w-14 rounded-full bg-[#dbe3ef]" />
          </div>
        </ThemeOption>
      </div>
    </Card>
  );
}

const TIMEZONES: string[] =
  typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

const AUTOMATIC_LABEL = "Automatic (use location’s timezone)";

// Common US-style names people actually search for ("eastern", "pacific"...)
// rather than the IANA city names those zones are keyed by underneath.
const TIMEZONE_ALIASES: { label: string; tz: string; keywords: string[] }[] = [
  { label: "Eastern Time", tz: "America/New_York", keywords: ["eastern", "et", "est", "edt"] },
  { label: "Central Time", tz: "America/Chicago", keywords: ["central", "ct", "cst", "cdt"] },
  { label: "Mountain Time", tz: "America/Denver", keywords: ["mountain", "mt", "mst", "mdt"] },
  { label: "Arizona Time (no DST)", tz: "America/Phoenix", keywords: ["arizona"] },
  { label: "Pacific Time", tz: "America/Los_Angeles", keywords: ["pacific", "pt", "pst", "pdt"] },
  { label: "Alaska Time", tz: "America/Anchorage", keywords: ["alaska", "akst", "akdt"] },
  { label: "Hawaii Time", tz: "Pacific/Honolulu", keywords: ["hawaii", "hst"] },
  { label: "Atlantic Time", tz: "America/Puerto_Rico", keywords: ["atlantic", "ast"] },
];
const ALIAS_TZ_SET = new Set(TIMEZONE_ALIASES.map((a) => a.tz));

function timezoneLabel(tz: string): string {
  if (tz === "") return AUTOMATIC_LABEL;
  const alias = TIMEZONE_ALIASES.find((a) => a.tz === tz);
  return alias ? `${alias.label} (${tz.replace(/_/g, " ")})` : tz.replace(/_/g, " ");
}

function TimezoneCard({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const [query, setQuery] = useState(timezoneLabel(value));
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(timezoneLabel(value));
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [value]);

  const needle = query.trim().toLowerCase();
  const aliasMatches = needle
    ? TIMEZONE_ALIASES.filter(
        (a) => a.label.toLowerCase().includes(needle) || a.keywords.some((k) => k.includes(needle))
      )
    : TIMEZONE_ALIASES;
  const matches = (
    needle
      ? TIMEZONES.filter((tz) => tz.replace(/_/g, " ").toLowerCase().includes(needle))
      : TIMEZONES
  )
    .filter((tz) => !ALIAS_TZ_SET.has(tz))
    .slice(0, 50);
  const showAutomatic = !needle || AUTOMATIC_LABEL.toLowerCase().includes(needle);

  function selectTimezone(next: string) {
    onChange(next);
    setQuery(timezoneLabel(next));
    setOpen(false);
  }

  return (
    <Card
      title="Timezone"
      description="Times across the dashboard use your saved location's timezone unless you fix one here."
    >
      <div ref={boxRef} className="relative">
        <input
          value={query}
          onFocus={(e) => {
            setOpen(true);
            e.target.select();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder="Search for a timezone…"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />

        {open && (
          <div className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface-2 shadow-xl">
            {showAutomatic && (
              <button
                type="button"
                onClick={() => selectTimezone("")}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-accent/10 ${
                  value === "" ? "text-accent-2" : "text-foreground"
                }`}
              >
                {AUTOMATIC_LABEL}
              </button>
            )}
            {aliasMatches.map((a) => (
              <button
                key={a.tz}
                type="button"
                onClick={() => selectTimezone(a.tz)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-accent/10 ${
                  value === a.tz ? "text-accent-2" : "text-foreground"
                }`}
              >
                {a.label}
                <span className="ml-1.5 text-xs text-muted">{a.tz.replace(/_/g, " ")}</span>
              </button>
            ))}
            {aliasMatches.length > 0 && matches.length > 0 && (
              <div className="border-t border-border" />
            )}
            {matches.map((tz) => (
              <button
                key={tz}
                type="button"
                onClick={() => selectTimezone(tz)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-accent/10 ${
                  value === tz ? "text-accent-2" : "text-foreground"
                }`}
              >
                {timezoneLabel(tz)}
              </button>
            ))}
            {!showAutomatic && aliasMatches.length === 0 && matches.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted">No matching timezone.</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function ClockFormatCard({
  value,
  onChange,
}: {
  value: "12h" | "24h";
  onChange: (next: "12h" | "24h") => void;
}) {
  return (
    <Card title="Clock format" description="Choose how times are displayed across the dashboard.">
      <div className="flex gap-3">
        <ThemeOption label="12-hour" active={value === "12h"} onClick={() => onChange("12h")}>
          <div className="flex h-14 w-full items-center justify-center rounded-lg border border-border/60 bg-surface-2 text-sm text-foreground">
            1:00 PM
          </div>
        </ThemeOption>
        <ThemeOption label="24-hour" active={value === "24h"} onClick={() => onChange("24h")}>
          <div className="flex h-14 w-full items-center justify-center rounded-lg border border-border/60 bg-surface-2 text-sm text-foreground">
            13:00
          </div>
        </ThemeOption>
      </div>
    </Card>
  );
}

function ThemeOption({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border p-2 text-left transition ${
        active ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-accent/50"
      }`}
    >
      {children}
      <div className="mt-2 flex items-center gap-1.5 text-xs text-foreground">
        <span
          className={`h-1.5 w-1.5 rounded-full ${active ? "bg-accent" : "bg-transparent border border-border"}`}
        />
        {label}
      </div>
    </button>
  );
}
