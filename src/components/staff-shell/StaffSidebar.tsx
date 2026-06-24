"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import {
  CalendarDays,
  LayoutDashboard,
  Wrench,
  Building2,
  Boxes,
  Users,
  ArrowLeftRight,
  BarChart3,
  LogOut,
  X,
  ShieldAlert,
  Package,
  FileText,
  ClipboardCheck,
  KeyRound,
  Settings,
  UserCircle,
  ClipboardList,
  ListTodo,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth.actions";
import PushNotificationToggle from "@/components/layout/PushNotificationToggle";

type StaffSidebarProps = {
  role: string;
  name: string;
  profilePicture?: string;
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

type NavAccent =
  | "gold"
  | "bookings"
  | "facilities"
  | "inventory"
  | "maintenance"
  | "finance"
  | "duty";

/** Static class strings so Tailwind sees them at build time. */
const ACTIVE_ACCENT: Record<NavAccent, string> = {
  gold:        "bg-gold/15 border-gold/25 [&_svg]:text-gold",
  bookings:    "bg-bookings/15 border-bookings/25 [&_svg]:text-bookings",
  facilities:  "bg-facilities/15 border-facilities/25 [&_svg]:text-facilities",
  inventory:   "bg-inventory/15 border-inventory/25 [&_svg]:text-inventory",
  maintenance: "bg-maintenance/15 border-maintenance/25 [&_svg]:text-maintenance",
  finance:     "bg-finance/15 border-finance/25 [&_svg]:text-finance",
  duty:        "bg-duty/15 border-duty/25 [&_svg]:text-duty",
};

/* Grouped by job-to-be-done, not by data type. Every item stays reachable;
   ordering reflects how a facility manager actually moves through a day. */
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, accent: "gold" as NavAccent },
      { href: "/tasks",     label: "Tasks",     icon: ListTodo,        accent: "gold" as NavAccent },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/bookings", label: "Bookings", icon: CalendarDays, accent: "bookings" as NavAccent },
      { href: "/checkin", label: "Check-In", icon: ClipboardCheck, accent: "bookings" as NavAccent },
      { href: "/ceremony-codes", label: "Ceremony Codes", icon: KeyRound, accent: "bookings" as NavAccent, roles: ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"] },
      { href: "/bookings/content", label: "Booking Content", icon: FileText, accent: "bookings" as NavAccent, roles: ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"] },
      { href: "/duty", label: "Duty Logs", icon: ClipboardList, accent: "duty" as NavAccent },
    ],
  },
  {
    label: "Spaces & Assets",
    items: [
      { href: "/facilities", label: "Facilities", icon: Building2, accent: "facilities" as NavAccent },
      { href: "/items", label: "Items & Packages", icon: Package, accent: "inventory" as NavAccent },
      { href: "/inventory", label: "Inventory", icon: Boxes, accent: "inventory" as NavAccent },
      { href: "/maintenance", label: "Maintenance", icon: Wrench, accent: "maintenance" as NavAccent, roles: ["FACILITY_MANAGER", "VICAR", "SUPER_ADMIN"] },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, accent: "finance" as NavAccent },
      { href: "/reports", label: "Reports", icon: BarChart3, accent: "finance" as NavAccent, roles: ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"] },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/staff", label: "Staff", icon: Users, accent: "gold" as NavAccent, roles: ["FACILITY_MANAGER", "SUPER_ADMIN"] },
    ],
  },
];

const ADMIN_NAV = [
  { href: "/users", label: "Manage Users", icon: Users },
  { href: "/audit", label: "Audit Logs", icon: ShieldAlert },
];

const BOTTOM_NAV = [
  { href: "/settings", label: "Site Settings", icon: Settings, roles: ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"] },
  { href: "/profile", label: "My Profile", icon: UserCircle },
];

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function NavItem({ href, label, Icon, isActive, accent = "gold", compact = false }: { href: string; label: string; Icon: React.ElementType; isActive: boolean; accent?: NavAccent; compact?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      title={compact ? label : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg text-[0.82rem] transition-all duration-150 relative border",
        compact ? "justify-center px-0 py-2.5" : "px-3 py-2",
        isActive
          ? cn("font-semibold text-[hsl(var(--sb-fg-strong))]", ACTIVE_ACCENT[accent])
          : "font-normal border-transparent text-[hsl(var(--sb-fg))] hover:text-[hsl(var(--sb-fg-strong))] hover:bg-[hsl(var(--sb-hover-bg))]"
      )}
    >
      <Icon size={compact ? 18 : 15} className={cn("shrink-0 transition-opacity", isActive ? "opacity-100" : "opacity-70")} />
      {!compact && <span className="truncate">{label}</span>}
    </Link>
  );
}

export default function StaffSidebar({ role, name, profilePicture, isOpen = false, onClose, collapsed = false, onToggleCollapse }: StaffSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = getInitials(name);

  useEffect(() => { onClose?.(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pathname]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  /** `compact` collapses to an icon rail (desktop only); `desktop` controls the
      collapse toggle vs the mobile close (X) button. */
  const renderSidebar = (compact: boolean, desktop: boolean) => (
    <aside
      className={cn(
        "bg-[hsl(var(--sb-bg))] border-r border-[hsl(var(--sb-border))] flex flex-col flex-shrink-0 relative overflow-hidden h-full transition-[width] duration-200",
        compact ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Ambient glow */}
      <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-[radial-gradient(circle,rgba(255,77,107,0.10)_0%,transparent_70%)] pointer-events-none" />

      {/* Logo */}
      <div className={cn("flex items-center gap-2.5 px-5 py-5 border-b border-[hsl(var(--sb-border))]", compact && "px-0 justify-center")}>
        <div className="w-8 h-8 rounded-lg bg-[rgba(255,77,107,0.15)] border border-[rgba(255,77,107,0.25)] flex items-center justify-center flex-shrink-0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        {!compact && (
          <div className="flex-1 min-w-0">
            <div className="text-[1rem] font-bold text-[hsl(var(--sb-fg-strong))] leading-none" style={{ fontFamily: "var(--font-display)" }}>
              First Love Center
            </div>
            <div className="text-[0.6rem] text-[hsl(var(--sb-muted))] uppercase tracking-[0.07em] mt-1">
              {role === "SUPER_ADMIN" ? "Super Admin" : role === "BOOKING_MANAGER" ? "Booking Manager" : "Staff Portal"}
            </div>
          </div>
        )}
        {onClose && !desktop && (
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md bg-[hsl(var(--sb-hover-bg))] text-[hsl(var(--sb-muted))] hover:text-[hsl(var(--sb-fg-strong))] transition-colors flex-shrink-0"
            aria-label="Close menu"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4 scrollbar-thin">
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter((item) => !("roles" in item) || ((item as { roles?: string[] }).roles?.includes(role) ?? true));
          if (visible.length === 0) return null;
          return (
            <div key={group.label ?? "core"}>
              {group.label && !compact && (
                <p className="px-3 mb-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-[hsl(var(--sb-muted))]">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visible.map(({ href, label, icon: Icon, accent }) => {
                  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
                  return <NavItem key={href} href={href} label={label} Icon={Icon} isActive={isActive} accent={accent} compact={compact} />;
                })}
              </div>
            </div>
          );
        })}

        {role === "SUPER_ADMIN" && (
          <div>
            {!compact && (
              <p className="px-3 mb-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-[hsl(var(--sb-muted))]">
                Administration
              </p>
            )}
            <div className="space-y-0.5">
              {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`);
                return <NavItem key={href} href={href} label={label} Icon={Icon} isActive={isActive} compact={compact} />;
              })}
            </div>
          </div>
        )}

        <div className="space-y-0.5">
          {BOTTOM_NAV.filter(item => !item.roles || item.roles.includes(role)).map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return <NavItem key={href} href={href} label={label} Icon={Icon} isActive={isActive} compact={compact} />;
          })}
        </div>
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-[hsl(var(--sb-border))]">
        {desktop && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={compact ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 mb-1 rounded-lg text-[0.82rem] font-medium text-[hsl(var(--sb-fg))] hover:text-[hsl(var(--sb-fg-strong))] hover:bg-[hsl(var(--sb-hover-bg))] transition-all duration-150",
              compact && "justify-center px-0"
            )}
          >
            {compact ? <PanelLeftOpen size={18} className="opacity-70" /> : <><PanelLeftClose size={14} className="opacity-70" /> Collapse</>}
          </button>
        )}

        <div className={cn("flex items-center gap-2.5 px-3 py-2.5 mb-1", compact && "px-0 justify-center")}>
          {profilePicture ? (
            <Image
              src={profilePicture}
              alt={name}
              width={32}
              height={32}
              unoptimized
              className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-[rgba(255,77,107,0.2)]"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[hsl(var(--sb-hover-bg))] border border-[rgba(255,77,107,0.2)] flex items-center justify-center text-[0.72rem] font-bold text-[var(--gold-bright)] flex-shrink-0">
              {initials}
            </div>
          )}
          {!compact && (
            <div className="min-w-0 flex-1">
              <div className="text-[0.78rem] font-semibold text-[hsl(var(--sb-fg-strong))] truncate">{name}</div>
              <div className="text-[0.6rem] text-[hsl(var(--sb-muted))] uppercase tracking-[0.06em] mt-0.5">
                {role.replace(/_/g, " ")}
              </div>
            </div>
          )}
        </div>
        {!compact && <PushNotificationToggle />}
        <button
          onClick={handleLogout}
          title={compact ? "Sign Out" : undefined}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.82rem] font-medium text-[hsl(var(--sb-fg))] hover:text-[hsl(var(--sb-fg-strong))] hover:bg-[hsl(var(--sb-hover-bg))] transition-all duration-150",
            compact && "justify-center px-0"
          )}
        >
          <LogOut size={14} className="opacity-60" /> {!compact && "Sign Out"}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: always visible, collapsible to an icon rail */}
      <div className="hidden lg:flex flex-shrink-0 h-full">
        {renderSidebar(collapsed, true)}
      </div>

      {/* Mobile: backdrop + slide-in drawer (always full width) */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(10,22,40,0.6)] backdrop-blur-sm"
          />
          <div className="relative h-full z-[51] flex flex-col animate-[slideInSidebar_0.22s_ease-out]">
            {renderSidebar(false, false)}
          </div>
        </div>
      )}
    </>
  );
}
