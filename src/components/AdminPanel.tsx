"use client";

import { useState } from "react";
import type { UserRow } from "@/lib/db";
import { AdminUserTable } from "@/components/AdminUserTable";
import { BackupPanel } from "@/components/BackupPanel";

type AdminUser = UserRow & { location_count: number };
type Tab = "users" | "backup";

export function AdminPanel({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUser[];
  currentUserId: number;
}) {
  const [tab, setTab] = useState<Tab>("users");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_220px] lg:items-start">
      <div className="min-w-0">
        {tab === "users" ? (
          <>
            <h1 className="mb-1 text-lg font-semibold text-foreground">Users</h1>
            <p className="mb-5 text-sm text-muted">Everyone with an account on this instance.</p>
            <AdminUserTable initialUsers={initialUsers} currentUserId={currentUserId} />
          </>
        ) : (
          <>
            <h1 className="mb-1 text-lg font-semibold text-foreground">Backup</h1>
            <p className="mb-5 text-sm text-muted">Create and restore backups of this instance&apos;s data.</p>
            <BackupPanel />
          </>
        )}
      </div>

      <aside className="rounded-2xl border border-border bg-surface/70 p-4 lg:sticky lg:top-6">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Admin Controls</h2>
        <nav className="space-y-1">
          <button
            type="button"
            onClick={() => setTab("users")}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
              tab === "users" ? "bg-accent/15 text-accent-2" : "text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            Users
          </button>
          <button
            type="button"
            onClick={() => setTab("backup")}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
              tab === "backup" ? "bg-accent/15 text-accent-2" : "text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            Backup
          </button>
        </nav>
      </aside>
    </div>
  );
}
