"use client";

import { useEffect, useRef, useState } from "react";
import type { CameraRow } from "@/lib/db";
import { CameraFormModal } from "@/components/CameraFormModal";
import { camerasToCsv, isDirectVideoSource, parseCamerasCsv } from "@/lib/camera-utils";

export function AdminCameraTable() {
  const [cameras, setCameras] = useState<CameraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [formCamera, setFormCamera] = useState<CameraRow | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<CameraRow | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/cameras");
        if (!res.ok) throw new Error("Failed to load cameras.");
        const data = await res.json();
        setCameras(data.cameras);
      } catch {
        setError("Couldn't load cameras. Try refreshing the page.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categories = [...new Set(cameras.map((c) => c.category))].sort((a, b) => a.localeCompare(b));

  const q = query.trim().toLowerCase();
  const filteredCameras = cameras.filter(
    (c) =>
      (c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)) &&
      (categoryFilter === "" || c.category === categoryFilter)
  );

  const allFilteredSelected = filteredCameras.length > 0 && filteredCameras.every((c) => selected.has(c.id));

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const c of filteredCameras) next.delete(c.id);
      } else {
        for (const c of filteredCameras) next.add(c.id);
      }
      return next;
    });
  }

  function handleSaved(camera: CameraRow) {
    setCameras((prev) => {
      const exists = prev.some((c) => c.id === camera.id);
      const next = exists ? prev.map((c) => (c.id === camera.id ? camera : c)) : [...prev, camera];
      return next.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    });
    setFormCamera(null);
  }

  async function handleDelete(camera: CameraRow) {
    const res = await fetch(`/api/admin/cameras/${camera.id}`, { method: "DELETE" });
    if (res.ok) {
      setCameras((prev) => prev.filter((c) => c.id !== camera.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(camera.id);
        return next;
      });
    }
    setDeleteTarget(null);
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    const ids = [...selected];
    const results = await Promise.all(
      ids.map(async (id) => {
        const res = await fetch(`/api/admin/cameras/${id}`, { method: "DELETE" });
        return { id, ok: res.ok };
      })
    );
    const deletedIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
    setCameras((prev) => prev.filter((c) => !deletedIds.has(c.id)));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of deletedIds) next.delete(id);
      return next;
    });
    setBulkDeleting(false);
  }

  function handleExport() {
    const csv = camerasToCsv(cameras);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cameras-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Rows are created one at a time (not in parallel) — modest CSV sizes make
  // that fine, and it keeps a partial failure easy to attribute to the row
  // that caused it instead of a pile of simultaneous errors.
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImportResult(null);
    setImportError(null);
    setImporting(true);
    try {
      const text = await file.text();
      const { cameras: parsed, errors: parseErrors } = parseCamerasCsv(text);
      if (parsed.length === 0) {
        setImportError(parseErrors[0] ?? "No cameras found in that file.");
        return;
      }

      const created: CameraRow[] = [];
      const rowErrors = [...parseErrors];
      for (const row of parsed) {
        try {
          const res = await fetch("/api/admin/cameras", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: row.name,
              category: row.category,
              sourceUrl: row.sourceUrl,
              audioUrl: row.audioUrl,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            rowErrors.push(`${row.name}: ${data.error || "failed to create."}`);
            continue;
          }
          let camera = data.camera as CameraRow;
          if (row.isOffline) {
            const offlineRes = await fetch(`/api/admin/cameras/${camera.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isOffline: true }),
            });
            if (offlineRes.ok) camera = ((await offlineRes.json()) as { camera: CameraRow }).camera;
          }
          created.push(camera);
        } catch {
          rowErrors.push(`${row.name}: network error.`);
        }
      }

      if (created.length > 0) {
        setCameras((prev) =>
          [...prev, ...created].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
        );
      }
      setImportResult(`Imported ${created.length} of ${parsed.length} camera${parsed.length === 1 ? "" : "s"}.`);
      if (rowErrors.length > 0) setImportError(rowErrors.join(" "));
    } catch {
      setImportError("Couldn't read that file.");
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface/50 p-10 text-center text-sm text-muted">
        Loading cameras…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-10 text-center text-sm text-danger">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cameras…"
          className="w-full max-w-xs rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <button
              type="button"
              disabled={bulkDeleting}
              onClick={handleBulkDelete}
              className="rounded-lg border border-danger/30 px-3 py-2 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-60"
            >
              {bulkDeleting ? "Deleting…" : `Delete ${selected.size} selected`}
            </button>
          )}
          <button
            type="button"
            disabled={cameras.length === 0}
            onClick={handleExport}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted transition hover:border-accent hover:text-foreground disabled:opacity-60"
          >
            Export CSV
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <button
            type="button"
            disabled={importing}
            onClick={() => importInputRef.current?.click()}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted transition hover:border-accent hover:text-foreground disabled:opacity-60"
          >
            {importing ? "Importing…" : "Import CSV"}
          </button>
          <button
            type="button"
            onClick={() => setFormCamera("new")}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-2"
          >
            Add camera
          </button>
        </div>
      </div>

      {(importResult || importError) && (
        <div className="space-y-1">
          {importResult && (
            <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-2">
              {importResult}
            </div>
          )}
          {importError && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {importError}
            </div>
          )}
        </div>
      )}

      {/* Desktop: full table. */}
      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface/70 md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="w-10 px-4 py-3">
                <SelectAllCheckbox
                  checked={allFilteredSelected}
                  indeterminate={!allFilteredSelected && filteredCameras.some((c) => selected.has(c.id))}
                  onChange={toggleSelectAll}
                  disabled={filteredCameras.length === 0}
                />
              </th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Audio</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredCameras.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  {cameras.length === 0 ? "No cameras yet." : `No cameras match "${query}".`}
                </td>
              </tr>
            ) : (
              filteredCameras.map((c) => (
                <CameraRowItem
                  key={c.id}
                  camera={c}
                  checked={selected.has(c.id)}
                  onToggleSelect={() => toggleSelect(c.id)}
                  onEdit={() => setFormCamera(c)}
                  onDelete={() => setDeleteTarget(c)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards. */}
      <div className="space-y-2 md:hidden">
        {filteredCameras.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface/70 px-4 py-6 text-center text-sm text-muted">
            {cameras.length === 0 ? "No cameras yet." : `No cameras match "${query}".`}
          </div>
        ) : (
          filteredCameras.map((c) => (
            <CameraCardItem
              key={c.id}
              camera={c}
              checked={selected.has(c.id)}
              onToggleSelect={() => toggleSelect(c.id)}
              onEdit={() => setFormCamera(c)}
              onDelete={() => setDeleteTarget(c)}
            />
          ))
        )}
      </div>

      {formCamera !== null && (
        <CameraFormModal
          camera={formCamera === "new" ? null : formCamera}
          onClose={() => setFormCamera(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-foreground">Delete &ldquo;{deleteTarget.name}&rdquo;?</p>
            <p className="mt-1 text-xs text-muted">
              This removes it from every user&rsquo;s view. This can&rsquo;t be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteTarget)}
                className="rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
  disabled,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label="Select all cameras"
      className="accent-accent"
    />
  );
}

// A small floating video/iframe preview shown while hovering the camera's
// name — lets an admin sanity-check a feed without leaving the table for
// the full picker on the Cameras page.
function CameraNamePreview({ camera }: { camera: CameraRow }) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);

  function handleEnter() {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left });
    }
    setHovered(true);
  }

  const isDirectVideo = isDirectVideoSource(camera.source_url);

  return (
    <span
      ref={anchorRef}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setHovered(false)}
      className="cursor-default underline decoration-dotted decoration-muted/50 underline-offset-4"
    >
      {camera.name}
      {hovered && pos && (
        <div
          style={{ position: "fixed", top: pos.top, left: pos.left }}
          className="z-[70] w-56 overflow-hidden rounded-xl border border-border bg-black shadow-2xl"
        >
          <div className="aspect-video w-full bg-black">
            {isDirectVideo ? (
              <video
                src={camera.source_url}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <iframe src={camera.source_url} className="h-full w-full border-0" allow="autoplay" />
            )}
          </div>
          <p className="truncate px-2 py-1 text-[11px] text-muted">{camera.category}</p>
        </div>
      )}
    </span>
  );
}

function CameraRowItem({
  camera,
  checked,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  camera: CameraRow;
  checked: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className={checked ? "bg-accent/5" : undefined}>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleSelect}
          aria-label={`Select ${camera.name}`}
          className="accent-accent"
        />
      </td>
      <td className="px-4 py-3 text-foreground">
        <div className="flex items-center gap-1.5">
          <CameraNamePreview camera={camera} />
          {camera.is_offline === 1 && (
            <span className="shrink-0 rounded bg-danger/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger">
              Offline
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-muted">{camera.category}</td>
      <td className="max-w-xs truncate px-4 py-3">
        <a
          href={camera.source_url}
          target="_blank"
          rel="noreferrer"
          className="text-accent-2 hover:underline"
        >
          {camera.source_url}
        </a>
      </td>
      <td className="px-4 py-3 text-muted">{camera.has_audio ? "Yes" : "N/A"}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition hover:border-accent hover:text-foreground"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-danger/30 px-2.5 py-1 text-xs text-danger transition hover:bg-danger/10"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function CameraCardItem({
  camera,
  checked,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  camera: CameraRow;
  checked: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${checked ? "border-accent bg-accent/5" : "border-border bg-surface/70"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggleSelect}
            aria-label={`Select ${camera.name}`}
            className="mt-1 accent-accent"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
              {camera.name}
              {camera.is_offline === 1 && (
                <span className="shrink-0 rounded bg-danger/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger">
                  Offline
                </span>
              )}
            </p>
            <p className="text-xs text-muted">{camera.category}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition hover:border-accent hover:text-foreground"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-danger/30 px-2.5 py-1 text-xs text-danger transition hover:bg-danger/10"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="mt-2 divide-y divide-border">
        <div className="flex items-center justify-between gap-4 py-2">
          <span className="text-xs text-muted">Source</span>
          <a
            href={camera.source_url}
            target="_blank"
            rel="noreferrer"
            className="max-w-[70%] truncate text-sm text-accent-2 hover:underline"
          >
            {camera.source_url}
          </a>
        </div>
        <div className="flex items-center justify-between gap-4 py-2">
          <span className="text-xs text-muted">Audio</span>
          <span className="text-sm text-foreground">{camera.has_audio ? "Yes" : "N/A"}</span>
        </div>
      </div>
    </div>
  );
}
