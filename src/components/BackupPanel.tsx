"use client";

import { useState } from "react";
import { AdminPasswordConfirmModal, type ConfirmResult } from "@/components/AdminPasswordConfirmModal";

type ParsedBackup = {
  fileName: string;
  data: unknown;
  userCount: number;
  cameraCount: number;
};

type RestoreResult = {
  usersCreated: { username: string; recoveryUrl: string }[];
  usersUpdated: string[];
  usersSkipped: { username: string; reason: string }[];
  camerasCreated: number;
  camerasUpdated: number;
  camerasSkipped: number;
};

export function BackupPanel() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [copiedUser, setCopiedUser] = useState<string | null>(null);

  async function handleCreateBackup() {
    setError(null);
    setExporting(true);
    try {
      const res = await fetch("/api/admin/backup");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Couldn't create backup.");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `weather-app-backup-${new Date().toISOString().slice(0, 10)}.json`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't create backup.");
    } finally {
      setExporting(false);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setResult(null);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const users = Array.isArray(data?.users) ? data.users : null;
      const cameras = Array.isArray(data?.cameras) ? data.cameras : null;
      if (!users || !cameras) {
        setError("That file doesn't look like a valid backup.");
        return;
      }
      setParsed({ fileName: file.name, data, userCount: users.length, cameraCount: cameras.length });
    } catch {
      setError("Couldn't read that file — make sure it's a backup JSON file.");
    }
  }

  async function handleConfirmRestore(adminPassword: string): Promise<ConfirmResult> {
    if (!parsed) return { ok: false, error: "No backup file selected." };
    const res = await fetch("/api/admin/backup/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminPassword, backup: parsed.data }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || "Couldn't restore backup." };
    setResult(data.result);
    setParsed(null);
    return { ok: true };
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
      )}

      <div className="rounded-2xl border border-border bg-surface/70 p-5">
        <h3 className="text-sm font-medium text-foreground">Create backup</h3>
        <p className="mt-1 text-xs text-muted">
          Downloads a JSON file with every user (username, role, status, and features) and every camera.
          Passwords are never included. Use this file to rebuild the instance from scratch later.
        </p>
        <button
          type="button"
          onClick={handleCreateBackup}
          disabled={exporting}
          className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-2 disabled:opacity-60"
        >
          {exporting ? "Preparing…" : "Create backup"}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-surface/70 p-5">
        <h3 className="text-sm font-medium text-foreground">Restore from backup</h3>
        <p className="mt-1 text-xs text-muted">
          Users and cameras that match an existing username or camera are updated — passwords are never
          touched. Anything new in the file is created (new accounts get a one-time recovery link, shown
          below once restored, since their real password was never backed up). Nothing already on this
          instance is deleted.
        </p>

        <input
          type="file"
          accept=".json,application/json"
          onChange={handleFileSelected}
          className="mt-3 block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs file:text-foreground file:transition hover:file:border-accent"
        />

        {parsed && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-xs text-foreground">
            <span>
              <span className="font-medium">{parsed.fileName}</span> — {parsed.userCount} user
              {parsed.userCount === 1 ? "" : "s"}, {parsed.cameraCount} camera
              {parsed.cameraCount === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white transition hover:bg-accent-2"
            >
              Restore
            </button>
            <button
              type="button"
              onClick={() => setParsed(null)}
              className="rounded-lg border border-border px-3 py-1.5 text-muted transition hover:border-accent hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {result && (
        <div className="rounded-2xl border border-border bg-surface/70 p-5">
          <h3 className="text-sm font-medium text-foreground">Restore complete</h3>
          <ul className="mt-2 space-y-1 text-xs text-muted">
            <li>{result.usersUpdated.length} user(s) updated</li>
            <li>{result.usersCreated.length} user(s) created</li>
            <li>
              {result.camerasCreated} camera(s) created, {result.camerasUpdated} updated
            </li>
            {(result.usersSkipped.length > 0 || result.camerasSkipped > 0) && (
              <li className="text-warn">
                {result.usersSkipped.length} user row(s) and {result.camerasSkipped} camera row(s) skipped
                (invalid entries).
              </li>
            )}
          </ul>

          {result.usersCreated.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-foreground">
                New accounts — send each user their recovery link. It works once and lets them set their own
                password.
              </p>
              {result.usersCreated.map((u) => (
                <div
                  key={u.username}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-xs"
                >
                  <span className="shrink-0 text-foreground">{u.username}</span>
                  <code className="min-w-0 flex-1 truncate rounded-md bg-surface px-2 py-1 font-mono text-foreground">
                    {u.recoveryUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(u.recoveryUrl);
                      setCopiedUser(u.username);
                    }}
                    className="shrink-0 rounded-lg border border-border px-2 py-1 text-muted transition hover:border-accent hover:text-foreground"
                  >
                    {copiedUser === u.username ? "Copied!" : "Copy link"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {confirmOpen && (
        <AdminPasswordConfirmModal
          title="Restore from backup?"
          message="This updates matching users and cameras and creates anything new. Existing passwords are never overwritten. Enter your admin password to confirm."
          confirmLabel="Restore"
          onConfirm={handleConfirmRestore}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
