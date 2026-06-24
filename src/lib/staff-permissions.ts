/**
 * @deprecated Import from `@/lib/permissions` instead.
 * Re-exports for gradual migration.
 */
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_META,
  ROLE_PRESETS,
  PRESET_OPTIONS,
  defaultPermissionsForRole,
  resolvePermissions,
  hasPermission,
  isPermission,
  type Permission,
  type PermissionSet,
} from "./permissions";

export {
  type Permission,
  type PermissionSet,
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_META,
  LEGACY_KEY_MAP,
  isPermission,
  ROLE_PRESETS,
  PRESET_OPTIONS,
  defaultPermissionsForRole,
  permissionsToStored,
  resolvePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  sanitizePermissionInput,
  normalizeStored,
  STAFF_NAV_GROUPS,
  STAFF_ADMIN_NAV,
  STAFF_BOTTOM_NAV,
  STAFF_ACTION_ITEMS,
  ROUTE_PERMISSIONS,
  navItemVisible,
  permissionForPath,
} from "./permissions";

export type StaffPermissions = PermissionSet;
export type StaffPermissionKey = Permission;

export const PERMISSION_KEYS = ALL_PERMISSIONS;
export const DEFAULT_PERMISSIONS_FOR_ROLE = defaultPermissionsForRole;

export function hasStaffPermission(
  stored: Record<string, boolean> | undefined | null,
  role: string,
  key: Permission
): boolean {
  return hasPermission(role, stored, key);
}

export type VicarPermissions = PermissionSet;
export const DEFAULT_VICAR_PERMISSIONS = ROLE_PRESETS.VICAR;

export const PERMISSION_LABELS = Object.fromEntries(
  Object.entries(PERMISSION_META).map(([k, v]) => [k, v.label])
) as Record<Permission, string>;

export function isStaffPermissionKey(key: string): key is Permission {
  return isPermission(key);
}

export function isVicarPermissionKey(key: string): key is Permission {
  return isPermission(key);
}

export function hasVicarPermission(
  permissions: Record<string, boolean> | undefined,
  permission: string
): boolean {
  if (!isPermission(permission)) return false;
  return hasPermission("VICAR", permissions, permission);
}
