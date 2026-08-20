"use client";

import { useState } from "react";
import type { UserRow } from "@/lib/db";

type AdminUser = UserRow & { location_count: number };

function formatDateTime(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso + "Z").toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatDate(iso: string): string {
  return new Date(iso + "Z").toLocaleDateString();
}

export function AdminUserTable({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUser[];
  currentUserId: number;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState<string | null>(null);

  function patchUser(id: number, patch: Partial<AdminUser>) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  async function handleRoleChange(user: AdminUser, role: "admin" | "user") {
    setError(null);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Couldn't change role.");
      return;
    }
    patchUser(user.id, { role });
  }

  async function handleToggleActive(user: AdminUser) {
    setError(null);
    const nextActive = user.is_active !== 1;
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: nextActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Couldn't update status.");
      return;
    }
    patchUser(user.id, { is_active: nextActive ? 1 : 0 });
  }

  async function handleDelete(user: AdminUser) {
    setError(null);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Couldn't delete user.");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface/70">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Locations</th>
              <th className="px-4 py-3 font-medium">Last login</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <UserRowItem
                key={u.id}
                user={u}
                isSelf={u.id === currentUserId}
                onRoleChange={(role) => handleRoleChange(u, role)}
                onToggleActive={() => handleToggleActive(u)}
                onDelete={() => handleDelete(u)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRowItem({
  user,
  isSelf,
  onRoleChange,
  onToggleActive,
  onDelete,
}: {
  user: AdminUser;
  isSelf: boolean;
  onRoleChange: (role: "admin" | "user") => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const [resetting, setResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const disabledTitle = isSelf ? "Manage your own account from Settings" : undefined;
  const active = user.is_active === 1;

  async function handleResetPassword() {
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setTempPassword(data.tempPassword);
    } finally {
      setResetting(false);
    }
  }

  async function handleDeleteClick() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setBusy(true);
    try {
      await onDelete();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr>
        <td className="px-4 py-3 text-foreground">{user.username}</td>
        <td className="px-4 py-3">
          <select
            value={user.role}
            disabled={isSelf}
            title={disabledTitle}
            onChange={(e) => onRoleChange(e.target.value as "admin" | "user")}
            className={`rounded-full border-0 px-2 py-0.5 text-xs outline-none disabled:opacity-60 ${
              user.role === "admin" ? "bg-accent/15 text-accent-2" : "bg-surface-2 text-muted"
            }`}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </td>
        <td className="px-4 py-3">
          <button
            onClick={onToggleActive}
            disabled={isSelf}
            title={disabledTitle}
            className={`rounded-full px-2 py-0.5 text-xs transition disabled:opacity-60 ${
              active
                ? "bg-good/15 text-good hover:bg-good/25"
                : "bg-danger/15 text-danger hover:bg-danger/25"
            }`}
          >
            {active ? "Active" : "Deactivated"}
          </button>
        </td>
        <td className="px-4 py-3 text-muted">{user.location_count}</td>
        <td className="px-4 py-3 text-muted">{formatDateTime(user.last_login)}</td>
        <td className="px-4 py-3 text-muted">{formatDate(user.created_at)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetPassword}
              disabled={isSelf || resetting}
              title={disabledTitle}
              className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition hover:border-accent hover:text-foreground disabled:opacity-60"
            >
              {resetting ? "Resetting…" : "Reset password"}
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={isSelf || busy}
              title={disabledTitle}
              onBlur={() => setConfirmingDelete(false)}
              className={`rounded-lg border px-2.5 py-1 text-xs transition disabled:opacity-60 ${
                confirmingDelete
                  ? "border-danger bg-danger/15 text-danger"
                  : "border-border text-muted hover:border-danger hover:text-danger"
              }`}
            >
              {confirmingDelete ? "Confirm delete?" : "Delete"}
            </button>
          </div>
        </td>
      </tr>
      {tempPassword && (
        <tr>
          <td colSpan={7} className="bg-surface-2/60 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-foreground">
              <span className="text-muted">
                Temporary password for <span className="text-foreground">{user.username}</span> (they must
                change it on next login):
              </span>
              <code className="rounded-md bg-surface px-2 py-1 font-mono text-foreground">{tempPassword}</code>
              <button
                onClick={() => navigator.clipboard.writeText(tempPassword)}
                className="rounded-lg border border-border px-2 py-1 text-muted transition hover:border-accent hover:text-foreground"
              >
                Copy
              </button>
              <button
                onClick={() => setTempPassword(null)}
                className="rounded-lg border border-border px-2 py-1 text-muted transition hover:border-accent hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
