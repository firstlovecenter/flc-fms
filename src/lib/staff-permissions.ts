export interface VicarPermissions {
  canCreateBookings:    boolean;
  canCancelBookings:    boolean;
  canViewFinancials:    boolean;
  canSubmitExpenses:    boolean;
  canCreateMaintenance: boolean;
  canManageFacilities:  boolean;
  canViewPatrons:       boolean;
  canCreateEvents:      boolean;
}

export const DEFAULT_VICAR_PERMISSIONS: VicarPermissions = {
  canCreateBookings:    true,
  canCancelBookings:    false,
  canViewFinancials:    false,
  canSubmitExpenses:    true,
  canCreateMaintenance: true,
  canManageFacilities:  false,
  canViewPatrons:       true,
  canCreateEvents:      false,
};

export const PERMISSION_LABELS: Record<keyof VicarPermissions, string> = {
  canCreateBookings:    "Create Bookings",
  canCancelBookings:    "Cancel Bookings",
  canViewFinancials:    "View Financials",
  canSubmitExpenses:    "Submit Expense Requests",
  canCreateMaintenance: "Create Maintenance Requests",
  canManageFacilities:  "Manage Facilities",
  canViewPatrons:       "View Patrons",
  canCreateEvents:      "Create Events",
};
