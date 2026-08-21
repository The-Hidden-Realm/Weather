"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }
      // A full reload (not router.push) so the new session cookie is
      // guaranteed to be picked up on the next request instead of racing
      // with the client router's cache of the pre-login session state.
      window.location.href = params.get("next") || "/";
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6-1.7A4 4 0 0 0 6 16h11.5Z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Sign in to your weather dashboard</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-surface/80 p-6 shadow-xl shadow-black/20 backdrop-blur"
        >
          <label className="mb-1.5 block text-xs font-medium text-muted">Username</label>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mb-4 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            placeholder="Admin"
            autoComplete="username"
          />

          <label className="mb-1.5 block text-xs font-medium text-muted">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            placeholder="••••••••"
            autoComplete="current-password"
          />

          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-2 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-accent-2 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
