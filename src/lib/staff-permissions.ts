export interface VicarPermissions {
  canCreateBookings:    boolean;
  canCancelBookings:    boolean;
  canViewFinancials:    boolean;
  canSubmitExpenses:    boolean;
  canCreateMaintenance: boolean;
  canManageFacilities:  boolean;
  canViewPatrons:       boolean;
}

export const DEFAULT_VICAR_PERMISSIONS: VicarPermissions = {
  canCreateBookings:    true,
  canCancelBookings:    false,
  canViewFinancials:    false,
  canSubmitExpenses:    true,
  canCreateMaintenance: true,
  canManageFacilities:  false,
  canViewPatrons:       true,
};

export const PERMISSION_LABELS: Record<keyof VicarPermissions, string> = {
  canCreateBookings:    "Create Bookings",
  canCancelBookings:    "Cancel Bookings",
  canViewFinancials:    "View Financials",
  canSubmitExpenses:    "Submit Expense Requests",
  canCreateMaintenance: "Create Maintenance Requests",
  canManageFacilities:  "Manage Facilities",
  canViewPatrons:       "View Patrons",
};

export function isVicarPermissionKey(permission: string): permission is keyof VicarPermissions {
  return permission in DEFAULT_VICAR_PERMISSIONS;
}

export function hasVicarPermission(
  permissions: Record<string, boolean> | undefined,
  permission: string,
) {
  if (!isVicarPermissionKey(permission)) return false;
  return permissions?.[permission] ?? DEFAULT_VICAR_PERMISSIONS[permission];
}
