"use client";

import { useState } from "react";

export type ConfirmResult = { ok: true; revealValue?: string } | { ok: false; error: string };

export function AdminPasswordConfirmModal({
  title,
  message,
  confirmLabel,
  danger,
  revealLabel = "Temporary password",
  onConfirm,
  onClose,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  revealLabel?: string;
  onConfirm: (adminPassword: string) => Promise<ConfirmResult>;
  onClose: () => void;
  // Backing out before ever attempting the action (Cancel button, or
  // clicking the backdrop while the password form is still up) — distinct
  // from onClose, which fires once the action has actually gone through.
  // Defaults to onClose so callers that don't care can ignore it.
  onCancel?: () => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealValue, setRevealValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const cancel = onCancel ?? onClose;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await onConfirm(password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.revealValue) {
        setRevealValue(result.revealValue);
      } else {
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={revealValue ? onClose : cancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {revealValue ? (
          <>
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="mt-1 text-xs text-muted">
              {revealLabel} — copy it and send it to the user:
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-surface-2 px-2 py-1.5 font-mono text-sm text-foreground">
                {revealValue}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(revealValue);
                  setCopied(true);
                }}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition hover:border-accent hover:text-foreground"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-2"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="mt-1 text-xs text-muted">{message}</p>

            <label className="mb-1.5 mt-3 block text-xs font-medium text-muted">Your admin password</label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              autoComplete="current-password"
            />

            {error && (
              <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancel}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:border-accent hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !password}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white transition disabled:opacity-60 ${
                  danger ? "bg-danger hover:bg-danger/90" : "bg-accent hover:bg-accent-2"
                }`}
              >
                {busy ? "Checking…" : confirmLabel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
