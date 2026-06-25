import type { Permission } from "./catalog";

export type NavAccent =
  | "gold"
  | "bookings"
  | "facilities"
  | "inventory"
  | "maintenance"
  | "finance"
  | "duty";

export interface NavItemDef {
  href: string;
  label: string;
  accent?: NavAccent;
  /** Required permission(s) — user needs any one. */
  permission?: Permission | Permission[];
  /** Super Admin only (not in permission catalog). */
  superAdminOnly?: boolean;
}

export interface NavGroupDef {
  label: string;
  items: NavItemDef[];
}

/** Staff sidebar navigation — single source of truth. */
export const STAFF_NAV_GROUPS: NavGroupDef[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", accent: "gold" },
      { href: "/tasks", label: "Tasks", accent: "gold", permission: "tasks:view" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/bookings", label: "Bookings", accent: "bookings", permission: "bookings:view" },
      { href: "/checkin", label: "Check-In", accent: "bookings", permission: "checkin:perform" },
      { href: "/ceremony-codes", label: "Ceremony Codes", accent: "bookings", permission: "ceremony:manage" },
      { href: "/bookings/content", label: "Booking Content", accent: "bookings", permission: "bookings:manage_content" },
      { href: "/duty", label: "Duty Logs", accent: "duty", permission: "duty:view" },
    ],
  },
  {
    label: "Spaces & Assets",
    items: [
      { href: "/facilities", label: "Facilities", accent: "facilities", permission: "facilities:view" },
      { href: "/items", label: "Items & Packages", accent: "inventory", permission: "items:view" },
      { href: "/inventory", label: "Inventory", accent: "inventory", permission: "inventory:view" },
      { href: "/maintenance", label: "Maintenance", accent: "maintenance", permission: "maintenance:view" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/transactions", label: "Transactions", accent: "finance", permission: ["finance:view", "finance:submit_expense"] },
      { href: "/reports", label: "Reports", accent: "finance", permission: "reports:view" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/staff", label: "Staff", accent: "gold", permission: "staff:view" },
    ],
  },
];

export const STAFF_ADMIN_NAV: NavItemDef[] = [
  { href: "/users", label: "Manage Users", superAdminOnly: true },
  { href: "/audit", label: "Audit Logs", superAdminOnly: true },
];

export const STAFF_BOTTOM_NAV: NavItemDef[] = [
  { href: "/settings", label: "Site Settings", permission: "settings:manage" },
  { href: "/profile", label: "My Profile" },
];

/** Command palette action shortcuts. */
export const STAFF_ACTION_ITEMS: NavItemDef[] = [
  { href: "/bookings/new", label: "New Booking", permission: "bookings:create" },
  { href: "/duty/new", label: "Create Duty", permission: "duty:manage" },
  { href: "/transactions/new-expense", label: "New Expense", permission: "finance:submit_expense" },
  { href: "/transactions/new-income", label: "New Income", permission: "finance:record_income" },
];

/** Page-level permission requirements (exact path or prefix). */
export const ROUTE_PERMISSIONS: { pattern: string; permission: Permission | Permission[]; exact?: boolean }[] = [
  { pattern: "/transactions", permission: ["finance:view", "finance:submit_expense"], exact: true },
  { pattern: "/transactions/new-expense", permission: "finance:submit_expense" },
  { pattern: "/transactions/new-income", permission: "finance:record_income" },
  { pattern: "/transactions/savings", permission: "finance:savings" },
  { pattern: "/transactions/expenses", permission: "finance:submit_expense" },
  { pattern: "/transactions/income", permission: "finance:record_income" },
  { pattern: "/reports", permission: "reports:view", exact: true },
  { pattern: "/reports/subscriptions", permission: "reports:manage_subscriptions" },
  { pattern: "/bookings/new", permission: "bookings:create" },
  { pattern: "/bookings/content", permission: "bookings:manage_content" },
  { pattern: "/bookings", permission: "bookings:view", exact: true },
  { pattern: "/facilities/new", permission: "facilities:manage" },
  { pattern: "/facilities/bulk-slots", permission: "facilities:manage" },
  { pattern: "/facilities/categories", permission: "facilities:manage" },
  { pattern: "/facilities/", permission: "facilities:view" },
  { pattern: "/facilities", permission: "facilities:view", exact: true },
  { pattern: "/items/new", permission: "items:manage" },
  { pattern: "/items/bundles", permission: "items:manage" },
  { pattern: "/items/", permission: "items:manage" },
  { pattern: "/items", permission: "items:view", exact: true },
  { pattern: "/inventory/categories", permission: "inventory:manage" },
  { pattern: "/inventory/items", permission: "inventory:manage" },
  { pattern: "/inventory", permission: "inventory:view", exact: true },
  { pattern: "/maintenance/new", permission: "maintenance:create" },
  { pattern: "/maintenance", permission: "maintenance:view", exact: true },
  { pattern: "/staff/", permission: "staff:manage" },
  { pattern: "/staff", permission: "staff:view", exact: true },
  { pattern: "/duty/templates", permission: "duty:manage" },
  { pattern: "/duty/new", permission: "duty:manage" },
  { pattern: "/duty/", permission: "duty:view" },
  { pattern: "/duty", permission: "duty:view", exact: true },
  { pattern: "/ceremony-codes", permission: "ceremony:manage" },
  { pattern: "/settings", permission: "settings:manage" },
  { pattern: "/checkin", permission: "checkin:perform" },
  { pattern: "/tasks", permission: "tasks:view" },
];

export function permissionForPath(pathname: string): Permission | Permission[] | null {
  for (const route of ROUTE_PERMISSIONS) {
    if (route.exact) {
      if (pathname === route.pattern) return route.permission;
    } else if (pathname.startsWith(route.pattern)) {
      return route.permission;
    }
  }
  return null;
}

export function navItemVisible(
  item: NavItemDef,
  role: string,
  hasPerm: (p: Permission) => boolean
): boolean {
  if (item.superAdminOnly) return role === "SUPER_ADMIN";
  if (!item.permission) return true;
  const perms = Array.isArray(item.permission) ? item.permission : [item.permission];
  return perms.some((p) => hasPerm(p));
}
