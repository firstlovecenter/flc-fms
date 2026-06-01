"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  CalendarDays, LayoutDashboard, Wrench, Building2, Boxes, Users,
  ArrowLeftRight, BarChart3, LogOut, X, ShieldAlert, Package,
} from "lucide-react";
import { logout } from "@/actions/auth.actions";
import { cn } from "@/lib/utils";

type CampusSidebarProps = {
  role: string;
  name: string;
  isOpen?: boolean;
  onClose?: () => void;
};

const NAV = [
  { href: "/dashboard",   label: "Dashboard",       icon: LayoutDashboard },
  { href: "/bookings",    label: "Bookings",         icon: CalendarDays },
  { href: "/facilities",  label: "Facilities",       icon: Building2 },
  { href: "/items",       label: "Items & Packages", icon: Package },
  { href: "/inventory",   label: "Inventory",        icon: Boxes },
  { href: "/staff",       label: "Staff",            icon: Users,       roles: ["FACILITY_MANAGER", "SUPER_ADMIN"] },
  { href: "/maintenance", label: "Maintenance",      icon: Wrench,      roles: ["FACILITY_MANAGER", "VICAR", "SUPER_ADMIN"] },
  { href: "/transactions", label: "Transactions",   icon: ArrowLeftRight },
  { href: "/reports",     label: "Reports",          icon: BarChart3,   roles: ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"] },
];

const ADMIN_NAV = [
  { href: "/users", label: "Manage Users", icon: Users },
  { href: "/audit", label: "Audit Logs",   icon: ShieldAlert },
];

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function NavLink({ href, label, icon: Icon, isActive }: { href: string; label: string; icon: React.ElementType; isActive: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-[9px] rounded-lg mb-0.5 text-[0.83rem] border transition-all duration-150 no-underline",
        isActive
          ? "font-semibold text-white/95 border-[rgba(200,163,90,0.28)] bg-[rgba(200,163,90,0.14)]"
          : "font-normal text-white/50 border-transparent hover:bg-white/[0.06] hover:text-white/85"
      )}
    >
      <Icon size={16} className={isActive ? "opacity-90" : "opacity-60"} />
      {label}
    </Link>
  );
}

export default function CampusSidebar({ role, name, isOpen = false, onClose }: CampusSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = getInitials(name);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onClose?.(); }, [pathname]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const sidebarContent = (
    <aside className="w-[240px] bg-[var(--navy)] flex flex-col shrink-0 relative overflow-hidden h-full">
      {/* Gold glow */}
      <div className="absolute -top-[60px] -left-[60px] w-[240px] h-[240px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(200,163,90,0.1) 0%, transparent 70%)" }}
      />

      {/* Logo */}
      <div className="px-5 py-5 pb-[18px] border-b border-white/[0.06] flex items-center gap-2.5">
        <div className="w-[34px] h-[34px] rounded-[9px] bg-[rgba(200,163,90,0.15)] border border-[rgba(200,163,90,0.25)] flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[1rem] font-bold text-white leading-none" style={{ fontFamily: "var(--font-display)" }}>
            First Love Center
          </div>
          <div className="text-[0.6rem] text-white/30 tracking-[0.07em] uppercase mt-[3px]">
            {role === "SUPER_ADMIN" ? "Super Admin" : "Campus"}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-[30px] h-[30px] rounded-[6px] bg-white/[0.08] border-0 flex items-center justify-center cursor-pointer text-white/60 hover:text-white/90 hover:bg-white/[0.12] transition-colors shrink-0"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="px-5 pt-5 pb-2">
        <span className="text-[0.6rem] font-bold tracking-[0.1em] uppercase text-white/20">Navigation</span>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto">
        {NAV.filter((item) => !item.roles || item.roles.includes(role)).map(({ href, label, icon }) => (
          <NavLink key={href} href={href} label={label} icon={icon} isActive={pathname === href || pathname.startsWith(`${href}/`)} />
        ))}

        {role === "SUPER_ADMIN" && (
          <>
            <div className="px-3 pt-4 pb-2 mt-1">
              <span className="text-[0.6rem] font-bold tracking-[0.1em] uppercase text-white/20">Administration</span>
            </div>
            {ADMIN_NAV.map(({ href, label, icon }) => (
              <NavLink key={href} href={href} label={label} icon={icon} isActive={pathname === href || pathname.startsWith(`${href}/`)} />
            ))}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5 px-3 py-[10px] mb-1.5">
          <div className="w-[30px] h-[30px] rounded-full bg-[var(--navy-mid)] border border-[rgba(200,163,90,0.2)] flex items-center justify-center text-[0.72rem] font-bold text-[var(--gold-bright)] shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-[0.78rem] font-semibold text-white/80 truncate">{name}</div>
            <div className="text-[0.62rem] text-white/[0.28] uppercase tracking-[0.06em]">{role.replace(/_/g, " ")}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-[9px] rounded-lg text-[0.82rem] font-medium text-white/40 bg-transparent border-0 cursor-pointer hover:bg-white/[0.06] hover:text-white/70 transition-all duration-150"
        >
          <LogOut size={15} className="opacity-60" /> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden lg:flex shrink-0 h-full">
        {sidebarContent}
      </div>

      {/* Mobile: backdrop + slide-in drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div onClick={onClose} className="absolute inset-0 bg-[rgba(10,22,40,0.6)] backdrop-blur-[2px]" />
          <div className="relative h-full w-[240px] z-[51] flex flex-col animate-[slideInSidebar_0.22s_ease-out]">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
