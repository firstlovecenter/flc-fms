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

/** Booking Manager — bookings + finance view/submit + patrons view + browse facilities/items. */
const BOOKING_MANAGER = pick({
  "bookings:view": true,
  "bookings:create": true,
  "bookings:approve": true,
  "bookings:cancel": true,
  "bookings:manage_content": true,
  "finance:view": true,
  "finance:submit_expense": true,
  "facilities:view": true,
  "items:view": true,
  "inventory:view": true,
  "patrons:view": true,
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
  { value: "BOOKING_MANAGER", label: "Booking Manager", description: "Bookings, finances (view/submit), and patron views.", permissions: BOOKING_MANAGER },
  { value: "VICAR", label: "Vicar (limited)", description: "Bookings, maintenance, expenses, and patron views.", permissions: VICAR },
];

export function defaultPermissionsForRole(role: string): PermissionSet {
  return ROLE_PRESETS[role] ? { ...ROLE_PRESETS[role] } : fill(false);
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
