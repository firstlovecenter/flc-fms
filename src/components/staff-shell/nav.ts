import {
  CalendarDays,
  LayoutDashboard,
  Wrench,
  Building2,
  Boxes,
  Users,
  ArrowLeftRight,
  BarChart3,
  ShieldAlert,
  Package,
  FileText,
  ClipboardCheck,
  KeyRound,
  Settings,
  UserCircle,
  ClipboardList,
  ListTodo,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import {
  STAFF_NAV_GROUPS,
  STAFF_ADMIN_NAV,
  STAFF_BOTTOM_NAV,
  navItemVisible,
  type Permission,
  type PermissionSet,
} from "@/lib/permissions";

export const NAV_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/tasks": ListTodo,
  "/bookings": CalendarDays,
  "/checkin": ClipboardCheck,
  "/ceremony-codes": KeyRound,
  "/bookings/content": FileText,
  "/feedback": MessageSquare,
  "/duty": ClipboardList,
  "/facilities": Building2,
  "/items": Package,
  "/inventory": Boxes,
  "/maintenance": Wrench,
  "/transactions": ArrowLeftRight,
  "/reports": BarChart3,
  "/staff": Users,
  "/users": Users,
  "/audit": ShieldAlert,
  "/settings": Settings,
  "/profile": UserCircle,
};

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  FACILITY_MANAGER: "Facility Manager",
  VICAR: "Vicar",
  PATRON: "Patron",
  BOOKING_MANAGER: "Booking Manager",
  STAFF: "Staff",
};

export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  if (!pathname.startsWith(`${href}/`)) return false;
  // A more specific item (e.g. /bookings/content under /bookings) claims its own pages.
  return !ALL_ITEMS.some(
    (other) => other.href !== href && other.href.startsWith(`${href}/`) &&
      (pathname === other.href || pathname.startsWith(`${other.href}/`)),
  );
}

const ALL_ITEMS: { href: string; label: string; group: string }[] = [
  ...STAFF_NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ href: i.href, label: i.label, group: g.label ?? "Overview" }))),
  ...STAFF_ADMIN_NAV.map((i) => ({ href: i.href, label: i.label, group: "Administration" })),
  ...STAFF_BOTTOM_NAV.map((i) => ({ href: i.href, label: i.label, group: "Account" })),
];

export type Crumb = { label: string; href?: string };

/** Where you are: group › page › (New | Details). */
export function crumbsFor(pathname: string): Crumb[] {
  const match = ALL_ITEMS
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (!match) return [{ label: "Dashboard", href: "/dashboard" }];
  if (match.href === "/dashboard") return [{ label: "Dashboard" }];
  const crumbs: Crumb[] = [{ label: match.group }, { label: match.label, href: match.href }];
  if (pathname !== match.href) {
    const rest = pathname.slice(match.href.length + 1).split("/")[0];
    crumbs.push({ label: rest === "new" ? "New" : "Details" });
  }
  return crumbs;
}

export type Area = { label: string; href: string; active: boolean };

/** One entry per nav group this person can open, linking to its first page. */
export function areasFor(pathname: string, role: string, permissions?: PermissionSet): Area[] {
  const hasPerm = (p: Permission) => role === "SUPER_ADMIN" || (permissions?.[p] ?? false);
  const current = crumbsFor(pathname)[0]?.label;
  const areas = STAFF_NAV_GROUPS.map((g) => {
    const first = g.items.find((i) => navItemVisible(i, role, hasPerm));
    const label = g.label ?? "Overview";
    return first ? { label, href: first.href, active: current === label || (label === "Overview" && pathname === "/dashboard") } : null;
  }).filter((a): a is Area => a !== null);
  if (role === "SUPER_ADMIN") {
    areas.push({ label: "Administration", href: STAFF_ADMIN_NAV[0].href, active: current === "Administration" });
  }
  return areas;
}
