"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  CalendarDays,
  LayoutDashboard,
  Wrench,
  Building2,
  Tags,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth.actions";
import PushNotificationToggle from "@/components/layout/PushNotificationToggle";

type StaffSidebarProps = {
  role: string;
  name: string;
  isOpen?: boolean;
  onClose?: () => void;
};

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Bookings",
    items: [
      { href: "/bookings", label: "Bookings", icon: CalendarDays },
      { href: "/checkin", label: "Check-In", icon: ClipboardCheck },
      { href: "/bookings/content", label: "Booking Content", icon: FileText, roles: ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"] },
    ],
  },
  {
    label: "Facilities & Inventory",
    items: [
      { href: "/facilities", label: "Facilities", icon: Building2 },
      { href: "/facilities/categories", label: "Category / Pricing", icon: Tags, roles: ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"] },
      { href: "/items", label: "Items & Packages", icon: Package },
      { href: "/inventory", label: "Inventory", icon: Boxes },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
      { href: "/reports", label: "Reports", icon: BarChart3, roles: ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"] },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/staff", label: "Staff", icon: Users, roles: ["FACILITY_MANAGER", "SUPER_ADMIN"] },
      { href: "/maintenance", label: "Maintenance", icon: Wrench, roles: ["FACILITY_MANAGER", "VICAR", "SUPER_ADMIN"] },
    ],
  },
];

const ADMIN_NAV = [
  { href: "/users", label: "Manage Users", icon: Users },
  { href: "/audit", label: "Audit Logs", icon: ShieldAlert },
];

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function NavItem({ href, label, Icon, isActive }: { href: string; label: string; Icon: React.ElementType; isActive: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.82rem] transition-all duration-150 relative",
        isActive
          ? "font-semibold text-white bg-[rgba(200,163,90,0.14)] border border-[rgba(200,163,90,0.28)] pl-3"
          : "font-normal text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.85)] hover:bg-[rgba(255,255,255,0.06)] border border-transparent"
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--gold)] rounded-r-full" />
      )}
      <Icon size={15} className={cn("shrink-0 transition-opacity", isActive ? "opacity-90" : "opacity-55")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function StaffSidebar({ role, name, isOpen = false, onClose }: StaffSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = getInitials(name);

  useEffect(() => { onClose?.(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pathname]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const sidebarContent = (
    <aside className="bg-[var(--navy)] dark:bg-[rgba(7,18,34,0.92)] dark:backdrop-blur-md dark:border-r dark:border-[rgba(181,203,238,0.08)] flex flex-col flex-shrink-0 relative overflow-hidden h-full w-[240px]">
      {/* Ambient glow */}
      <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-[radial-gradient(circle,rgba(200,163,90,0.10)_0%,transparent_70%)] pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="w-8 h-8 rounded-lg bg-[rgba(200,163,90,0.15)] border border-[rgba(200,163,90,0.25)] flex items-center justify-center flex-shrink-0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[1rem] font-bold text-white leading-none" style={{ fontFamily: "var(--font-display)" }}>
            First Love Center
          </div>
          <div className="text-[0.6rem] text-[rgba(255,255,255,0.3)] uppercase tracking-[0.07em] mt-1">
            {role === "SUPER_ADMIN" ? "Super Admin" : role === "BOOKING_MANAGER" ? "Booking Manager" : "Staff Portal"}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)] hover:text-white transition-colors flex-shrink-0"
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
              {group.label && (
                <p className="px-3 mb-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-[rgba(255,255,255,0.2)]">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visible.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
                  return <NavItem key={href} href={href} label={label} Icon={Icon} isActive={isActive} />;
                })}
              </div>
            </div>
          );
        })}

        {role === "SUPER_ADMIN" && (
          <div>
            <p className="px-3 mb-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-[rgba(255,255,255,0.2)]">
              Administration
            </p>
            <div className="space-y-0.5">
              {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`);
                return <NavItem key={href} href={href} label={label} Icon={Icon} isActive={isActive} />;
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1">
          <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(200,163,90,0.2)] flex items-center justify-center text-[0.72rem] font-bold text-[var(--gold-bright)] flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[0.78rem] font-semibold text-[rgba(255,255,255,0.8)] truncate">{name}</div>
            <div className="text-[0.6rem] text-[rgba(255,255,255,0.28)] uppercase tracking-[0.06em] mt-0.5">
              {role.replace(/_/g, " ")}
            </div>
          </div>
        </div>
        <PushNotificationToggle />
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.82rem] font-medium text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.06)] transition-all duration-150"
        >
          <LogOut size={14} className="opacity-60" /> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden lg:flex flex-shrink-0 h-full">
        {sidebarContent}
      </div>

      {/* Mobile: backdrop + slide-in drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(10,22,40,0.6)] backdrop-blur-sm"
          />
          <div className="relative h-full z-[51] flex flex-col" style={{ animation: "slideInSidebar 0.22s ease-out" }}>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
