import type { Permission } from "./catalog";
import { ALL_PERMISSIONS } from "./catalog";

export type PermissionSet = Record<Permission, boolean>;

function fill(value: boolean): PermissionSet {
  return Object.fromEntries(ALL_PERMISSIONS.map((k) => [k, value])) as PermissionSet;
}

function pick(entries: Partial<PermissionSet>): PermissionSet {
  const base = fill(false);
  for (const [k, v] of Object.entries(entries)) {
    if (k in base && typeof v === "boolean") base[k as Permission] = v;
  }
  return base;
}

/** Full FM preset — all permissions except patrons:manage (Super Admin only). */
const FACILITY_MANAGER = fill(true);
FACILITY_MANAGER["patrons:manage"] = false;

/** Booking Manager — bookings + manage facilities/items/patrons/ceremony + reports. No finance. */
const BOOKING_MANAGER = pick({
  "bookings:view": true,
  "bookings:create": true,
  "bookings:approve": true,
  "bookings:cancel": true,
  "bookings:manage_content": true,
  "finance:submit_expense": true,
  "facilities:view": true,
  "facilities:manage": true,
  "items:view": true,
  "items:manage": true,
  "inventory:view": true,
  "patrons:view": true,
  "patrons:manage": true,
  "ceremony:manage": true,
  "checkin:perform": true,
  "reports:view": true,
  "reports:manage_subscriptions": true,
  "settings:manage": true,
  "tasks:view": true,
  "duty:view": true,
});

/** Vicar — limited operational access. */
const VICAR = pick({
  "bookings:view": true,
  "bookings:create": true,
  "maintenance:view": true,
  "maintenance:create": true,
  "finance:submit_expense": true,
  "patrons:view": true,
  "facilities:view": true,
  "items:view": true,
  "inventory:view": true,
  "checkin:perform": true,
  "tasks:view": true,
  "duty:view": true,
});

export const ROLE_PRESETS: Record<string, PermissionSet> = {
  SUPER_ADMIN: fill(true),
  FACILITY_MANAGER,
  BOOKING_MANAGER,
  VICAR,
};

const OPERATIONS_NO_FINANCE: PermissionSet = {
  ...FACILITY_MANAGER,
  "finance:view": false,
  "finance:submit_expense": false,
  "finance:approve_expense": false,
  "finance:record_income": false,
  "finance:savings": false,
  "reports:view": false,
  "reports:manage_subscriptions": false,
};

export const PRESET_OPTIONS: {
  value: string;
  label: string;
  description: string;
  permissions: PermissionSet;
}[] = [
  { value: "FACILITY_MANAGER", label: "Facility Manager", description: "Full access to everything except patron account management.", permissions: FACILITY_MANAGER },
  { value: "OPERATIONS_NO_FINANCE", label: "Operations (no finance)", description: "Full operations access without finance or reports.", permissions: OPERATIONS_NO_FINANCE },
  { value: "BOOKING_MANAGER", label: "Booking Manager", description: "Bookings, manage facilities/items/patrons/ceremony, and reports. No finance.", permissions: BOOKING_MANAGER },
  { value: "VICAR", label: "Vicar (limited)", description: "Bookings, maintenance, expenses, and patron views.", permissions: VICAR },
];

export function defaultPermissionsForRole(role: string): PermissionSet {
  return ROLE_PRESETS[role] ? { ...ROLE_PRESETS[role] } : fill(false);
}

/**
 * Resolves an Add/Edit-staff selection — a preset value (e.g. OPERATIONS_NO_FINANCE)
 * or a real role (SUPER_ADMIN / FACILITY_MANAGER / STAFF) — to the DB role that
 * should be stored plus the permission set to seed.
 *
 * Only FACILITY_MANAGER and SUPER_ADMIN are "real" privileged roles; every other
 * preset maps to the neutral STAFF role with the preset's permissions.
 * `permissions: null` means Super Admin (no stored permissions — full access is implicit).
 */
export function resolveStaffPreset(value: string): { role: string; permissions: PermissionSet | null } {
  if (value === "SUPER_ADMIN") return { role: "SUPER_ADMIN", permissions: null };
  if (value === "FACILITY_MANAGER") return { role: "FACILITY_MANAGER", permissions: FACILITY_MANAGER };
  if (value === "STAFF") return { role: "STAFF", permissions: fill(false) };
  const opt = PRESET_OPTIONS.find((p) => p.value === value);
  if (opt) return { role: "STAFF", permissions: opt.permissions };
  // Legacy fallback: treat an unknown value as a direct role name.
  return { role: value, permissions: defaultPermissionsForRole(value) };
}

/** Full explicit stored JSON (all keys) for DB seeding / editor saves. */
export function permissionsToFullStored(perms: PermissionSet): Record<string, boolean> {
  return Object.fromEntries(ALL_PERMISSIONS.map((k) => [k, perms[k]])) as Record<string, boolean>;
}

/** Stored JSON for new staff / role changes (only true keys to keep payload small). */
export function permissionsToStored(perms: PermissionSet): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(perms)) {
    if (v) out[k] = true;
  }
  return out;
}
