"use client";

import Link from "next/link";

export function ErrorPageContent({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
        </div>

        <div className="rounded-2xl border border-border bg-surface/80 p-6 shadow-xl shadow-black/20 backdrop-blur">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted">{message}</p>

          <div className="mt-6 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-accent"
            >
              Go back
            </button>
            <Link
              href="/"
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-2"
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
