"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionPayload } from "@/lib/session";
import { TimezonePicker } from "@/components/TimezonePicker";
import { ClockFormatPicker } from "@/components/ClockFormatPicker";
import { ThemePicker } from "@/components/ThemePicker";

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

export function SettingsForm({
  session,
  firstName: initialFirstName,
  email: initialEmail,
}: {
  session: SessionPayload;
  firstName: string;
  email: string;
}) {
  const router = useRouter();

  // Username, name, email, theme, timezone, and clock format are staged
  // locally and only written to the account when the user presses "Save
  // settings" — nothing here should hit the server on its own.
  const [username, setUsername] = useState(session.username);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [email, setEmail] = useState(initialEmail);
  const [theme, setTheme] = useState<"dark" | "light">(session.theme);
  const [timezone, setTimezone] = useState(session.timezone ?? "");
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">(session.timeFormat);

  const [savedUsername, setSavedUsername] = useState(username);
  const [savedFirstName, setSavedFirstName] = useState(firstName);
  const [savedEmail, setSavedEmail] = useState(email);
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
    firstName.trim() !== savedFirstName ||
    email.trim() !== savedEmail ||
    theme !== savedTheme ||
    timezone !== savedTimezone ||
    timeFormat !== savedTimeFormat;

  // Name and email were required to finish onboarding — Settings can change
  // them to a new value, but not blank them out, since the account is
  // never supposed to be without one.
  const missingRequired = username.trim() === "" || firstName.trim() === "" || email.trim() === "";
  const canSave = dirty && !missingRequired && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          firstName: firstName.trim(),
          email: email.trim(),
          theme,
          timezone: timezone || null,
          timeFormat,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMessage({ text: data.error || "Couldn't save settings.", kind: "error" });
        return;
      }
      setUsername(data.username);
      setSavedUsername(data.username);
      setFirstName(data.firstName);
      setSavedFirstName(data.firstName);
      setEmail(data.email);
      setSavedEmail(data.email);
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
      <NameCard value={firstName} onChange={setFirstName} />
      <EmailCard value={email} onChange={setEmail} />
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
          disabled={!canSave}
          title={missingRequired ? "Username, name, and email are required and can't be left blank." : undefined}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-lg transition hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}

function UsernameCard({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const empty = value.trim() === "";
  return (
    <Card title="Username" description="This is what shows up as “Logged in as”.">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/30 ${
          empty ? "border-danger/50 focus:border-danger" : "border-border focus:border-accent"
        }`}
      />
      {empty && <p className="mt-1.5 text-xs text-danger">Required — this can&apos;t be left blank.</p>}
    </Card>
  );
}

function NameCard({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const empty = value.trim() === "";
  return (
    <Card title="Name" description="Visible only to you and admins — never shown to other users.">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="First name"
        className={`w-full rounded-lg border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/30 ${
          empty ? "border-danger/50 focus:border-danger" : "border-border focus:border-accent"
        }`}
      />
      {empty && <p className="mt-1.5 text-xs text-danger">Required — this can&apos;t be left blank.</p>}
    </Card>
  );
}

function EmailCard({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const empty = value.trim() === "";
  return (
    <Card title="Email" description="Used for account recovery. Visible only to you and admins.">
      <input
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="you@example.com"
        className={`w-full rounded-lg border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/30 ${
          empty ? "border-danger/50 focus:border-danger" : "border-border focus:border-accent"
        }`}
      />
      {empty && <p className="mt-1.5 text-xs text-danger">Required — this can&apos;t be left blank.</p>}
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
      <ThemePicker value={value} onChange={onChange} />
    </Card>
  );
}

function TimezoneCard({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <Card
      title="Timezone"
      description="Times across the dashboard use your saved location's timezone unless you fix one here."
    >
      <TimezonePicker value={value} onChange={onChange} />
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
      <ClockFormatPicker value={value} onChange={onChange} />
    </Card>
  );
}

