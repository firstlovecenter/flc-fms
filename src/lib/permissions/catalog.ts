/**
 * Resource-action permission catalog.
 * Stored in User.permissions as { "bookings:create": true, ... }.
 */

export const PERMISSION_META = {
  "bookings:view":          { label: "View Bookings",          description: "See the bookings list and booking details." },
  "bookings:create":        { label: "Create Bookings",        description: "Create new facility bookings on behalf of the church." },
  "bookings:approve":       { label: "Approve Bookings",       description: "Approve or reject pending bookings." },
  "bookings:cancel":        { label: "Cancel Bookings",        description: "Cancel existing bookings." },
  "bookings:manage_content":{ label: "Manage Booking Content", description: "Edit booking terms and public booking content." },
  "finance:view":           { label: "View Finances",          description: "See transactions, balances, and the dashboard finance summary." },
  "finance:submit_expense": { label: "Submit Expenses",        description: "Submit expense requests for approval." },
  "finance:approve_expense":{ label: "Approve Expenses",       description: "Approve or reject expense requests." },
  "finance:record_income":  { label: "Record Income",          description: "Record income entries." },
  "finance:savings":        { label: "Manage Savings",         description: "Transfer money between an account and savings." },
  "finance:manage_accounts":{ label: "Manage Accounts",        description: "Create and manage independent money accounts (bank, mobile money, cash, etc.) that income, expenses, and savings transfers are recorded against." },
  "facilities:view":        { label: "View Facilities",        description: "View facility listings and details." },
  "facilities:manage":      { label: "Manage Facilities",      description: "Edit facility details, slots, pricing, and maintenance locks." },
  "items:view":             { label: "View Items & Packages",  description: "View bookable items and bundles." },
  "items:manage":           { label: "Manage Items & Packages",description: "Create and edit bookable items and bundles." },
  "inventory:view":         { label: "View Inventory",         description: "View inventory stock and checkouts." },
  "inventory:manage":       { label: "Manage Inventory",       description: "Manage inventory items, categories, and checkouts." },
  "maintenance:view":       { label: "View Maintenance",       description: "View maintenance requests." },
  "maintenance:create":     { label: "Create Maintenance",     description: "Log maintenance requests for facilities." },
  "maintenance:manage":     { label: "Manage Maintenance",     description: "Assign, update, and close maintenance requests." },
  "patrons:view":           { label: "View Patrons",           description: "View patron profiles and booking history." },
  "patrons:manage":         { label: "Manage Patrons",         description: "Create and edit patron accounts (Super Admin)." },
  "staff:view":             { label: "View Staff",             description: "View the staff directory." },
  "staff:manage":           { label: "Manage Staff",           description: "Add staff, reset passwords, and edit permissions." },
  "duty:view":              { label: "View Duty Logs",         description: "View duty log assignments." },
  "duty:manage":            { label: "Manage Duty Logs",       description: "Create templates, assign duty, and sign off logs." },
  "checkin:perform":        { label: "Perform Check-In",       description: "Check patrons in and out of facilities." },
  "ceremony:manage":        { label: "Manage Ceremony",        description: "Manage ceremony codes, venue configurations, and bishops." },
  "settings:manage":        { label: "Manage Site Settings",   description: "Edit office contact info and site configuration." },
  "reports:view":           { label: "View Reports",           description: "Access the reports dashboard and download CSVs." },
  "reports:manage_subscriptions": { label: "Manage Report Subscriptions", description: "Manage scheduled report email subscribers." },
  "tasks:view":             { label: "View Tasks",             description: "Access the personal task inbox." },
} as const;

export type Permission = keyof typeof PERMISSION_META;

export const ALL_PERMISSIONS = Object.keys(PERMISSION_META) as Permission[];

/** Legacy boolean keys → resource-action keys (for DB migration at read time). */
export const LEGACY_KEY_MAP: Record<string, Permission> = {
  canCreateBookings:    "bookings:create",
  canCancelBookings:    "bookings:cancel",
  canViewFinancials:    "finance:view",
  canSubmitExpenses:    "finance:submit_expense",
  canCreateMaintenance: "maintenance:create",
  canManageFacilities:  "facilities:manage",
  canViewPatrons:       "patrons:view",
};

/** UI groups for the permissions editor. */
export const PERMISSION_GROUPS: {
  title: string;
  permissions: { key: Permission; label: string; description: string }[];
}[] = [
  {
    title: "Bookings",
    permissions: [
      "bookings:view", "bookings:create", "bookings:approve", "bookings:cancel", "bookings:manage_content",
    ].map((key) => ({ key: key as Permission, ...PERMISSION_META[key as Permission] })),
  },
  {
    title: "Finance",
    permissions: [
      "finance:view", "finance:submit_expense", "finance:approve_expense", "finance:record_income", "finance:savings", "finance:manage_accounts",
    ].map((key) => ({ key: key as Permission, ...PERMISSION_META[key as Permission] })),
  },
  {
    title: "Facilities & Items",
    permissions: [
      "facilities:view", "facilities:manage", "items:view", "items:manage",
    ].map((key) => ({ key: key as Permission, ...PERMISSION_META[key as Permission] })),
  },
  {
    title: "Inventory & Maintenance",
    permissions: [
      "inventory:view", "inventory:manage", "maintenance:view", "maintenance:create", "maintenance:manage",
    ].map((key) => ({ key: key as Permission, ...PERMISSION_META[key as Permission] })),
  },
  {
    title: "People & Staff",
    permissions: [
      "patrons:view", "patrons:manage", "staff:view", "staff:manage",
    ].map((key) => ({ key: key as Permission, ...PERMISSION_META[key as Permission] })),
  },
  {
    title: "Operations",
    permissions: [
      "duty:view", "duty:manage", "checkin:perform", "ceremony:manage", "settings:manage", "tasks:view",
    ].map((key) => ({ key: key as Permission, ...PERMISSION_META[key as Permission] })),
  },
  {
    title: "Reports",
    permissions: [
      "reports:view", "reports:manage_subscriptions",
    ].map((key) => ({ key: key as Permission, ...PERMISSION_META[key as Permission] })),
  },
];

export function isPermission(value: string): value is Permission {
  return value in PERMISSION_META;
}
