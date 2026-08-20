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

  return (
    <div className="space-y-5">
      <UsernameCard initialUsername={session.username} />
      <PasswordCard />
      <ThemeCard initialTheme={session.theme} onChanged={() => router.refresh()} />
      <TimezoneCard initialTimezone={session.timezone} onChanged={() => router.refresh()} />
      <ClockFormatCard initialFormat={session.timeFormat} onChanged={() => router.refresh()} />
    </div>
  );
}

function UsernameCard({ initialUsername }: { initialUsername: string }) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [message, setMessage] = useState<{ text: string; kind: "error" | "success" } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Couldn't update username.", kind: "error" });
        return;
      }
      setMessage({ text: "Username updated.", kind: "success" });
      router.refresh();
    } catch {
      setMessage({ text: "Something went wrong. Try again.", kind: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Username" description="This is what shows up as “Logged in as”.">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="submit"
          disabled={loading || username.trim() === initialUsername}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-2 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </form>
      {message && <Message {...message} />}
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

function ThemeCard({ initialTheme, onChanged }: { initialTheme: "dark" | "light"; onChanged: () => void }) {
  const [theme, setTheme] = useState(initialTheme);
  const [loading, setLoading] = useState(false);

  async function selectTheme(next: "dark" | "light") {
    if (next === theme || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next }),
      });
      if (res.ok) {
        setTheme(next);
        onChanged();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Appearance" description="Pick how The Hidden Realm Weather looks for your account.">
      <div className="flex gap-3">
        <ThemeOption label="Dark" active={theme === "dark"} onClick={() => selectTheme("dark")}>
          <div className="h-14 w-full rounded-lg border border-border/60 bg-[#0a0e17] p-2">
            <div className="h-2 w-8 rounded-full bg-[#3b82f6]" />
            <div className="mt-2 h-2 w-14 rounded-full bg-[#223049]" />
          </div>
        </ThemeOption>
        <ThemeOption label="Light" active={theme === "light"} onClick={() => selectTheme("light")}>
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

function TimezoneCard({
  initialTimezone,
  onChanged,
}: {
  initialTimezone: string | null;
  onChanged: () => void;
}) {
  const [timezone, setTimezone] = useState(initialTimezone ?? "");
  const [query, setQuery] = useState(timezoneLabel(initialTimezone ?? ""));
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<{ text: string; kind: "error" | "success" } | null>(null);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(timezoneLabel(timezone));
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [timezone]);

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

  async function selectTimezone(next: string) {
    setTimezone(next);
    setQuery(timezoneLabel(next));
    setOpen(false);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: next || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Couldn't update timezone.", kind: "error" });
        return;
      }
      onChanged();
    } catch {
      setMessage({ text: "Something went wrong. Try again.", kind: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title="Timezone"
      description="Times across the dashboard use your saved location's timezone unless you fix one here."
    >
      <div ref={boxRef} className="relative">
        <input
          value={query}
          disabled={loading}
          onFocus={(e) => {
            setOpen(true);
            e.target.select();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder="Search for a timezone…"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
        />

        {open && (
          <div className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface-2 shadow-xl">
            {showAutomatic && (
              <button
                type="button"
                onClick={() => selectTimezone("")}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-accent/10 ${
                  timezone === "" ? "text-accent-2" : "text-foreground"
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
                  timezone === a.tz ? "text-accent-2" : "text-foreground"
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
                  timezone === tz ? "text-accent-2" : "text-foreground"
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
      {message && <Message {...message} />}
    </Card>
  );
}

function ClockFormatCard({
  initialFormat,
  onChanged,
}: {
  initialFormat: "12h" | "24h";
  onChanged: () => void;
}) {
  const [format, setFormat] = useState(initialFormat);
  const [loading, setLoading] = useState(false);

  async function selectFormat(next: "12h" | "24h") {
    if (next === format || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeFormat: next }),
      });
      if (res.ok) {
        setFormat(next);
        onChanged();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Clock format" description="Choose how times are displayed across the dashboard.">
      <div className="flex gap-3">
        <ThemeOption label="12-hour" active={format === "12h"} onClick={() => selectFormat("12h")}>
          <div className="flex h-14 w-full items-center justify-center rounded-lg border border-border/60 bg-surface-2 text-sm text-foreground">
            1:00 PM
          </div>
        </ThemeOption>
        <ThemeOption label="24-hour" active={format === "24h"} onClick={() => selectFormat("24h")}>
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
