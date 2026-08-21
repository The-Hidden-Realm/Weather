"use client";

import { useEffect, useRef, useState } from "react";
import type { UserRow } from "@/lib/db";
import { AVAILABLE_FEATURES, FEATURE_META, getUserFeatures, type FeatureKey } from "@/lib/features";
import { AdminPasswordConfirmModal, type ConfirmResult } from "@/components/AdminPasswordConfirmModal";

type AdminUser = UserRow & { location_count: number };

function formatDateTime(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso + "Z").toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatDate(iso: string): string {
  return new Date(iso + "Z").toLocaleDateString();
}

type ModalState =
  // returnToInfo: opened from inside the "more info" command center, so
  // backing out without completing the action should reopen it instead of
  // just closing everything — easy to recover from an accidental click.
  | { type: "delete"; user: AdminUser; returnToInfo?: boolean }
  | { type: "role"; user: AdminUser; nextRole: "admin" | "user"; returnToInfo?: boolean }
  | { type: "reset"; user: AdminUser; returnToInfo?: boolean }
  | { type: "info"; user: AdminUser };

export function AdminUserTable({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUser[];
  currentUserId: number;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [query, setQuery] = useState("");

  const filteredUsers = users.filter((u) => u.username.toLowerCase().includes(query.trim().toLowerCase()));

  function patchUser(id: number, patch: Partial<AdminUser>) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
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

  async function handleToggleFeature(user: AdminUser, feature: FeatureKey) {
    setError(null);
    const current = getUserFeatures(user);
    const next = current.includes(feature) ? current.filter((f) => f !== feature) : [...current, feature];
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features: next }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Couldn't update features.");
      return;
    }
    patchUser(user.id, { enabled_features: JSON.stringify(next) });
  }

  async function handleModalConfirm(adminPassword: string): Promise<ConfirmResult> {
    if (!modal || modal.type === "info") return { ok: false, error: "Nothing to confirm." };

    if (modal.type === "delete") {
      const res = await fetch(`/api/admin/users/${modal.user.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || "Couldn't delete user." };
      setUsers((prev) => prev.filter((u) => u.id !== modal.user.id));
      return { ok: true };
    }

    if (modal.type === "role") {
      const res = await fetch(`/api/admin/users/${modal.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: modal.nextRole, adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || "Couldn't change role." };
      patchUser(modal.user.id, { role: modal.nextRole });
      return { ok: true };
    }

    // reset
    const res = await fetch(`/api/admin/users/${modal.user.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminPassword }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || "Couldn't reset password." };
    return { ok: true, revealValue: data.tempPassword };
  }

  function modalProps(m: Exclude<ModalState, { type: "info" }>) {
    if (m.type === "delete") {
      return {
        title: `Delete ${m.user.username}?`,
        message: "This can't be undone. Enter your admin password to confirm.",
        confirmLabel: "Delete",
        danger: true,
      };
    }
    if (m.type === "role") {
      return {
        title: `Change ${m.user.username}'s role to ${m.nextRole === "admin" ? "Admin" : "User"}?`,
        message: "Enter your admin password to confirm this role change.",
        confirmLabel: "Change role",
      };
    }
    return {
      title: `Reset ${m.user.username}'s password?`,
      message: "They'll need to sign in with a new temporary password. Enter your admin password to confirm.",
      confirmLabel: "Reset password",
    };
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search users…"
        className="w-full max-w-xs rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
      />

      {/* Desktop: full table, unchanged. */}
      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface/70 md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Features</th>
              <th className="px-4 py-3 font-medium">Last login</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted">
                  No users match &ldquo;{query}&rdquo;.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <UserRowItem
                  key={u.id}
                  user={u}
                  isSelf={u.id === currentUserId}
                  onRoleChangeRequest={(nextRole) => setModal({ type: "role", user: u, nextRole })}
                  onToggleActive={() => handleToggleActive(u)}
                  onToggleFeature={(feature) => handleToggleFeature(u, feature)}
                  onDeleteRequest={() => setModal({ type: "delete", user: u })}
                  onResetPasswordRequest={() => setModal({ type: "reset", user: u })}
                  onInfoRequest={() => setModal({ type: "info", user: u })}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards instead of a cramped table. */}
      <div className="space-y-2 md:hidden">
        {filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface/70 px-4 py-6 text-center text-sm text-muted">
            No users match &ldquo;{query}&rdquo;.
          </div>
        ) : (
          filteredUsers.map((u) => (
            <UserCardItem
              key={u.id}
              user={u}
              isSelf={u.id === currentUserId}
              onRoleChangeRequest={(nextRole) => setModal({ type: "role", user: u, nextRole })}
              onToggleActive={() => handleToggleActive(u)}
              onToggleFeature={(feature) => handleToggleFeature(u, feature)}
              onDeleteRequest={() => setModal({ type: "delete", user: u })}
              onResetPasswordRequest={() => setModal({ type: "reset", user: u })}
              onInfoRequest={() => setModal({ type: "info", user: u })}
            />
          ))
        )}
      </div>

      {modal && modal.type === "info" && (() => {
        // Re-derived from the live list (not the snapshot captured when the
        // modal opened) so toggling status/features updates what's shown
        // immediately instead of freezing at open-time values.
        const liveUser = users.find((u) => u.id === modal.user.id) ?? modal.user;
        return (
          <UserManagementModal
            user={liveUser}
            onClose={() => setModal(null)}
            onRoleChangeRequest={(nextRole) => setModal({ type: "role", user: liveUser, nextRole, returnToInfo: true })}
            onToggleActive={() => handleToggleActive(liveUser)}
            onToggleFeature={(feature) => handleToggleFeature(liveUser, feature)}
            onResetPasswordRequest={() => setModal({ type: "reset", user: liveUser, returnToInfo: true })}
            onDeleteRequest={() => setModal({ type: "delete", user: liveUser, returnToInfo: true })}
          />
        );
      })()}

      {modal && modal.type !== "info" && (() => {
        const m = modal;
        return (
          <AdminPasswordConfirmModal
            {...modalProps(m)}
            onConfirm={handleModalConfirm}
            onClose={() => setModal(null)}
            onCancel={() => setModal(m.returnToInfo ? { type: "info", user: m.user } : null)}
          />
        );
      })()}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function RoleSelect({
  user,
  disabled,
  disabledTitle,
  onRoleChangeRequest,
}: {
  user: AdminUser;
  disabled: boolean;
  disabledTitle?: string;
  onRoleChangeRequest: (role: "admin" | "user") => void;
}) {
  return (
    <select
      value={user.role}
      disabled={disabled}
      title={disabledTitle}
      onChange={(e) => onRoleChangeRequest(e.target.value as "admin" | "user")}
      className={`rounded-full border-0 px-2 py-0.5 text-xs outline-none disabled:opacity-60 ${
        user.role === "admin" ? "bg-accent/15 text-accent-2" : "bg-surface-2 text-muted"
      }`}
    >
      <option value="user">User</option>
      <option value="admin">Admin</option>
    </select>
  );
}

function StatusToggle({
  user,
  disabled,
  disabledTitle,
  onToggleActive,
}: {
  user: AdminUser;
  disabled: boolean;
  disabledTitle?: string;
  onToggleActive: () => void;
}) {
  const active = user.is_active === 1;
  return (
    <button
      type="button"
      onClick={onToggleActive}
      disabled={disabled}
      title={disabledTitle}
      className={`rounded-full px-2 py-0.5 text-xs transition disabled:opacity-60 ${
        active ? "bg-good/15 text-good hover:bg-good/25" : "bg-danger/15 text-danger hover:bg-danger/25"
      }`}
    >
      {active ? "Active" : "Deactivated"}
    </button>
  );
}

// A per-user command center: everything the table row can do (role, status,
// features, reset, delete) plus name/email/other details the row doesn't
// show — all in one place, without touching the row-level controls, which
// stay exactly where they were.
function UserManagementModal({
  user,
  onClose,
  onRoleChangeRequest,
  onToggleActive,
  onToggleFeature,
  onResetPasswordRequest,
  onDeleteRequest,
}: {
  user: AdminUser;
  onClose: () => void;
  onRoleChangeRequest: (role: "admin" | "user") => void;
  onToggleActive: () => void;
  onToggleFeature: (feature: FeatureKey) => void;
  onResetPasswordRequest: () => void;
  onDeleteRequest: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-medium text-foreground">{user.username}</p>
        <p className="mt-1 text-xs text-muted">Visible only to you as an admin, and to this user.</p>

        <div className="mt-3 divide-y divide-border">
          <InfoRow label="Name" value={user.first_name || "—"} />
          <InfoRow label="Email" value={user.email || "—"} />
          <InfoRow label="Role" value={<RoleSelect user={user} disabled={false} onRoleChangeRequest={onRoleChangeRequest} />} />
          <InfoRow label="Status" value={<StatusToggle user={user} disabled={false} onToggleActive={onToggleActive} />} />
          <InfoRow label="Features" value={<FeaturesDropdown user={user} onToggleFeature={onToggleFeature} />} />
          <InfoRow label="Saved location" value={user.location_count > 0 ? "Set" : "None"} />
          <InfoRow label="Last login" value={formatDateTime(user.last_login)} />
          <InfoRow label="Joined" value={formatDate(user.created_at)} />
        </div>

        <div className="mt-4 flex justify-between gap-2 border-t border-border pt-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onResetPasswordRequest}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground transition hover:border-accent"
            >
              Reset password
            </button>
            <button
              type="button"
              onClick={onDeleteRequest}
              className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs text-danger transition hover:bg-danger/10"
            >
              Delete
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function FeaturesDropdown({
  user,
  onToggleFeature,
}: {
  user: AdminUser;
  onToggleFeature: (feature: FeatureKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const enabled = getUserFeatures(user);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleToggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 6, left: rect.left });
    }
    setOpen((o) => !o);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleOpen}
        className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition hover:border-accent hover:text-foreground"
      >
        {enabled.length > 0 ? `${enabled.length} enabled` : "Home only"}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && panelPos && (
        <div
          ref={panelRef}
          style={{ position: "fixed", top: panelPos.top, left: panelPos.left }}
          className="z-[60] max-h-72 w-56 overflow-y-auto rounded-xl border border-border bg-surface-2 p-2 shadow-xl"
        >
          <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted">
            <input type="checkbox" checked disabled className="accent-accent" />
            <span className="flex-1">Home</span>
            <span className="rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted">
              Navigation
            </span>
          </label>
          {AVAILABLE_FEATURES.map((feature) => (
            <label
              key={feature}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-accent/10"
            >
              <input
                type="checkbox"
                checked={enabled.includes(feature)}
                onChange={() => onToggleFeature(feature)}
                className="accent-accent"
              />
              <span className="flex-1">{FEATURE_META[feature].label}</span>
              <span className="rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted">
                {FEATURE_META[feature].group}
              </span>
            </label>
          ))}
        </div>
      )}
    </>
  );
}

function ActionsMenu({
  disabled,
  disabledTitle,
  onInfoRequest,
  onResetPasswordRequest,
  onDeleteRequest,
}: {
  disabled: boolean;
  disabledTitle?: string;
  onInfoRequest: () => void;
  onResetPasswordRequest: () => void;
  onDeleteRequest: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleToggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 6, left: rect.right - 160 });
    }
    setOpen((o) => !o);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleOpen}
        disabled={disabled}
        title={disabledTitle}
        aria-label="More actions"
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted transition hover:border-accent hover:text-foreground disabled:opacity-60"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open && panelPos && (
        <div
          ref={panelRef}
          style={{ position: "fixed", top: panelPos.top, left: panelPos.left }}
          className="z-30 w-40 overflow-hidden rounded-xl border border-border bg-surface-2 p-1 shadow-xl"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onInfoRequest();
            }}
            className="block w-full rounded-lg px-3 py-2 text-left text-xs text-foreground hover:bg-accent/10"
          >
            More info
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onResetPasswordRequest();
            }}
            className="block w-full rounded-lg px-3 py-2 text-left text-xs text-foreground hover:bg-accent/10"
          >
            Reset password
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDeleteRequest();
            }}
            className="block w-full rounded-lg px-3 py-2 text-left text-xs text-danger hover:bg-danger/10"
          >
            Delete
          </button>
        </div>
      )}
    </>
  );
}

function UserRowItem({
  user,
  isSelf,
  onRoleChangeRequest,
  onToggleActive,
  onToggleFeature,
  onDeleteRequest,
  onResetPasswordRequest,
  onInfoRequest,
}: {
  user: AdminUser;
  isSelf: boolean;
  onRoleChangeRequest: (role: "admin" | "user") => void;
  onToggleActive: () => void;
  onToggleFeature: (feature: FeatureKey) => void;
  onDeleteRequest: () => void;
  onResetPasswordRequest: () => void;
  onInfoRequest: () => void;
}) {
  const disabledTitle = isSelf ? "Manage your own account from Settings" : undefined;

  return (
    <tr>
      <td className="px-4 py-3 text-foreground">{user.username}</td>
      <td className="px-4 py-3">
        <RoleSelect user={user} disabled={isSelf} disabledTitle={disabledTitle} onRoleChangeRequest={onRoleChangeRequest} />
      </td>
      <td className="px-4 py-3">
        <StatusToggle user={user} disabled={isSelf} disabledTitle={disabledTitle} onToggleActive={onToggleActive} />
      </td>
      <td className="px-4 py-3">
        <FeaturesDropdown user={user} onToggleFeature={onToggleFeature} />
      </td>
      <td className="px-4 py-3 text-muted">{formatDateTime(user.last_login)}</td>
      <td className="px-4 py-3 text-muted">{formatDate(user.created_at)}</td>
      <td className="px-4 py-3">
        <ActionsMenu
          disabled={isSelf}
          disabledTitle={disabledTitle}
          onInfoRequest={onInfoRequest}
          onResetPasswordRequest={onResetPasswordRequest}
          onDeleteRequest={onDeleteRequest}
        />
      </td>
    </tr>
  );
}

function UserCardItem({
  user,
  isSelf,
  onRoleChangeRequest,
  onToggleActive,
  onToggleFeature,
  onDeleteRequest,
  onResetPasswordRequest,
  onInfoRequest,
}: {
  user: AdminUser;
  isSelf: boolean;
  onRoleChangeRequest: (role: "admin" | "user") => void;
  onToggleActive: () => void;
  onToggleFeature: (feature: FeatureKey) => void;
  onDeleteRequest: () => void;
  onResetPasswordRequest: () => void;
  onInfoRequest: () => void;
}) {
  const disabledTitle = isSelf ? "Manage your own account from Settings" : undefined;

  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-foreground">{user.username}</p>
        <ActionsMenu
          disabled={isSelf}
          disabledTitle={disabledTitle}
          onInfoRequest={onInfoRequest}
          onResetPasswordRequest={onResetPasswordRequest}
          onDeleteRequest={onDeleteRequest}
        />
      </div>
      <div className="mt-2 divide-y divide-border">
        <InfoRow label="Role" value={<RoleSelect user={user} disabled={isSelf} disabledTitle={disabledTitle} onRoleChangeRequest={onRoleChangeRequest} />} />
        <InfoRow label="Status" value={<StatusToggle user={user} disabled={isSelf} disabledTitle={disabledTitle} onToggleActive={onToggleActive} />} />
        <InfoRow label="Features" value={<FeaturesDropdown user={user} onToggleFeature={onToggleFeature} />} />
        <InfoRow label="Last login" value={formatDateTime(user.last_login)} />
        <InfoRow label="Joined" value={formatDate(user.created_at)} />
      </div>
    </div>
  );
}
