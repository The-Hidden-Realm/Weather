import bcrypt from "bcryptjs";
import { getDb, type InstanceSettingsRow } from "@/lib/db";
import { AVAILABLE_FEATURES, type FeatureKey } from "@/lib/features";

// Features listed here are granted automatically to every new signup,
// instead of an admin having to enable them per-account afterward.
export function getAutoApproveFeatures(): FeatureKey[] {
  const row = getDb()
    .prepare("SELECT auto_approve_features FROM instance_settings WHERE id = 1")
    .get() as InstanceSettingsRow | undefined;
  if (!row) return [];
  try {
    const parsed = JSON.parse(row.auto_approve_features);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((f): f is FeatureKey => (AVAILABLE_FEATURES as readonly string[]).includes(f));
  } catch {
    return [];
  }
}

export function setAutoApproveFeatures(features: FeatureKey[]) {
  getDb()
    .prepare("UPDATE instance_settings SET auto_approve_features = ? WHERE id = 1")
    .run(JSON.stringify(features));
}

// Backs the hidden Ctrl+Shift+Enter reset on the sign-in page — only the
// hash is ever stored or returned, same treatment as a real password.
export function hasAdminRecoveryKey(): boolean {
  const row = getDb()
    .prepare("SELECT admin_recovery_key_hash FROM instance_settings WHERE id = 1")
    .get() as InstanceSettingsRow | undefined;
  return !!row?.admin_recovery_key_hash;
}

export function setAdminRecoveryKey(key: string | null) {
  const hash = key ? bcrypt.hashSync(key, 10) : null;
  getDb().prepare("UPDATE instance_settings SET admin_recovery_key_hash = ? WHERE id = 1").run(hash);
}

export function verifyAdminRecoveryKey(key: string): boolean {
  if (typeof key !== "string" || !key) return false;
  const row = getDb()
    .prepare("SELECT admin_recovery_key_hash FROM instance_settings WHERE id = 1")
    .get() as InstanceSettingsRow | undefined;
  if (!row?.admin_recovery_key_hash) return false;
  return bcrypt.compareSync(key, row.admin_recovery_key_hash);
}
