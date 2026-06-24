import { ALL_PERMISSIONS, LEGACY_KEY_MAP, isPermission, type Permission } from "./catalog";
import { defaultPermissionsForRole, type PermissionSet } from "./presets";

/** Normalize stored JSON — merges legacy boolean keys into resource-action keys. */
export function normalizeStored(
  stored?: Record<string, boolean> | null
): Record<string, boolean> {
  if (!stored) return {};
  const out: Record<string, boolean> = {};

  for (const [key, value] of Object.entries(stored)) {
    if (typeof value !== "boolean") continue;
    if (isPermission(key)) {
      out[key] = value;
      continue;
    }
    const mapped = LEGACY_KEY_MAP[key];
    if (mapped) out[mapped] = value;
  }
  return out;
}

/** Effective permission set: role preset + stored overrides (stored wins). */
export function resolvePermissions(
  role: string,
  stored?: Record<string, boolean> | null
): PermissionSet {
  if (role === "SUPER_ADMIN") {
    return Object.fromEntries(ALL_PERMISSIONS.map((k) => [k, true])) as PermissionSet;
  }

  const merged = { ...defaultPermissionsForRole(role) };
  const normalized = normalizeStored(stored);

  for (const k of ALL_PERMISSIONS) {
    if (typeof normalized[k] === "boolean") merged[k] = normalized[k];
  }
  return merged;
}

export function hasPermission(
  role: string,
  stored: Record<string, boolean> | undefined | null,
  permission: Permission
): boolean {
  if (role === "SUPER_ADMIN") return true;
  return resolvePermissions(role, stored)[permission];
}

export function hasAnyPermission(
  role: string,
  stored: Record<string, boolean> | undefined | null,
  permissions: Permission[]
): boolean {
  if (role === "SUPER_ADMIN") return true;
  const resolved = resolvePermissions(role, stored);
  return permissions.some((p) => resolved[p]);
}

export function hasAllPermissions(
  role: string,
  stored: Record<string, boolean> | undefined | null,
  permissions: Permission[]
): boolean {
  if (role === "SUPER_ADMIN") return true;
  const resolved = resolvePermissions(role, stored);
  return permissions.every((p) => resolved[p]);
}

/** Sanitize user input to known permission keys only. */
export function sanitizePermissionInput(
  input: Record<string, boolean>
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const k of ALL_PERMISSIONS) {
    if (typeof input[k] === "boolean") out[k] = input[k];
  }
  return out;
}
