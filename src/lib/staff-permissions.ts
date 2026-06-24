/**
 * Staff access is permission-based. Each staff member carries a set of boolean
 * permissions (stored in `User.permissions` JSON). Roles act as *presets* that
 * seed a sensible default permission set, which an admin can fine-tune per
 * staff member. SUPER_ADMIN always has full access.
 *
 * `resolvePermissions` / `hasStaffPermission` fall back to the role preset when
 * a permission isn't explicitly stored, so existing staff (no stored JSON) keep
 * their role's access during the migration — no lockouts.
 */

export interface StaffPermissions {
  canCreateBookings:    boolean;
  canCancelBookings:    boolean;
  canViewFinancials:    boolean;
  canSubmitExpenses:    boolean;
  canCreateMaintenance: boolean;
  canManageFacilities:  boolean;
  canViewPatrons:       boolean;
}

export type StaffPermissionKey = keyof StaffPermissions;

export const PERMISSION_KEYS: StaffPermissionKey[] = [
  "canCreateBookings",
  "canCancelBookings",
  "canViewFinancials",
  "canSubmitExpenses",
  "canCreateMaintenance",
  "canManageFacilities",
  "canViewPatrons",
];

/** UI metadata: label + description, grouped for the permissions editor. */
export const PERMISSION_GROUPS: {
  title: string;
  permissions: { key: StaffPermissionKey; label: string; description: string }[];
}[] = [
  {
    title: "Bookings",
    permissions: [
      { key: "canCreateBookings", label: "Create Bookings", description: "Create new facility bookings on behalf of the church." },
      { key: "canCancelBookings", label: "Cancel Bookings", description: "Cancel existing bookings." },
    ],
  },
  {
    title: "Facilities & Maintenance",
    permissions: [
      { key: "canManageFacilities", label: "Manage Facilities", description: "Edit facility details, slots, pricing, and maintenance locks." },
      { key: "canCreateMaintenance", label: "Create Maintenance Requests", description: "Log maintenance requests for facilities." },
    ],
  },
  {
    title: "Finance",
    permissions: [
      { key: "canViewFinancials", label: "View Finances", description: "See transactions, reports, balances, and the dashboard finance summary." },
      { key: "canSubmitExpenses", label: "Submit Expenses", description: "Submit expense requests for approval." },
    ],
  },
  {
    title: "People",
    permissions: [
      { key: "canViewPatrons", label: "View Patrons", description: "View patron profiles and booking history." },
    ],
  },
];

function fill(value: boolean): StaffPermissions {
  return {
    canCreateBookings: value,
    canCancelBookings: value,
    canViewFinancials: value,
    canSubmitExpenses: value,
    canCreateMaintenance: value,
    canManageFacilities: value,
    canViewPatrons: value,
  };
}

/** Role presets — the default permission set each role seeds. */
export const ROLE_PRESETS: Record<string, StaffPermissions> = {
  SUPER_ADMIN: fill(true),
  FACILITY_MANAGER: fill(true),
  BOOKING_MANAGER: {
    canCreateBookings: true,
    canCancelBookings: true,
    canViewFinancials: true,
    canSubmitExpenses: true,
    canCreateMaintenance: false,
    canManageFacilities: false,
    canViewPatrons: true,
  },
  VICAR: {
    canCreateBookings: true,
    canCancelBookings: false,
    canViewFinancials: false,
    canSubmitExpenses: true,
    canCreateMaintenance: true,
    canManageFacilities: false,
    canViewPatrons: true,
  },
};

/** Selectable presets in the add/edit-staff UI (roles + handy combos). */
export const PRESET_OPTIONS: { value: string; label: string; description: string; permissions: StaffPermissions }[] = [
  { value: "FACILITY_MANAGER", label: "Facility Manager", description: "Full access to everything.", permissions: ROLE_PRESETS.FACILITY_MANAGER },
  {
    value: "OPERATIONS_NO_FINANCE",
    label: "Operations (no finance)",
    description: "Everything a Facility Manager can do, except viewing finances and reports.",
    permissions: { ...ROLE_PRESETS.FACILITY_MANAGER, canViewFinancials: false, canSubmitExpenses: false },
  },
  { value: "BOOKING_MANAGER", label: "Booking Manager", description: "Bookings, finances, and patron views.", permissions: ROLE_PRESETS.BOOKING_MANAGER },
  { value: "VICAR", label: "Vicar (limited)", description: "Bookings, maintenance, expenses, and patron views.", permissions: ROLE_PRESETS.VICAR },
];

export const DEFAULT_PERMISSIONS_FOR_ROLE = (role: string): StaffPermissions =>
  ROLE_PRESETS[role] ?? fill(false);

export function isStaffPermissionKey(key: string): key is StaffPermissionKey {
  return (PERMISSION_KEYS as string[]).includes(key);
}

/** Effective permission set for a staff member (preset defaults + stored overrides). */
export function resolvePermissions(
  role: string,
  stored?: Record<string, boolean> | null
): StaffPermissions {
  if (role === "SUPER_ADMIN") return fill(true);
  const merged = { ...DEFAULT_PERMISSIONS_FOR_ROLE(role) };
  if (stored) {
    for (const k of PERMISSION_KEYS) {
      if (typeof stored[k] === "boolean") merged[k] = stored[k];
    }
  }
  return merged;
}

/** Does this staff member have the given permission? Super admin always does. */
export function hasStaffPermission(
  stored: Record<string, boolean> | undefined | null,
  role: string,
  key: StaffPermissionKey
): boolean {
  if (role === "SUPER_ADMIN") return true;
  return resolvePermissions(role, stored)[key];
}

// ──────────────────────────────────────────────────────────────────────────
// Backward-compatible aliases (older imports used the vicar-specific names).
// ──────────────────────────────────────────────────────────────────────────
export type VicarPermissions = StaffPermissions;
export const DEFAULT_VICAR_PERMISSIONS = ROLE_PRESETS.VICAR;
export const PERMISSION_LABELS = PERMISSION_GROUPS.reduce(
  (acc, g) => {
    for (const p of g.permissions) acc[p.key] = p.label;
    return acc;
  },
  {} as Record<StaffPermissionKey, string>
);

export function isVicarPermissionKey(key: string): key is StaffPermissionKey {
  return isStaffPermissionKey(key);
}

/**
 * Legacy helper used by `requirePermission`. Vicars (and any non-admin staff)
 * are checked against their resolved permissions; FM/BM keep their existing
 * bypass in the guard layer.
 */
export function hasVicarPermission(
  permissions: Record<string, boolean> | undefined,
  permission: string
): boolean {
  if (!isStaffPermissionKey(permission)) return false;
  return resolvePermissions("VICAR", permissions)[permission];
}
