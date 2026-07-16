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
  Repeat2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout, switchToPatronContext } from "@/actions/auth.actions";
import PushNotificationToggle from "@/components/layout/PushNotificationToggle";
import {
  STAFF_NAV_GROUPS,
  STAFF_ADMIN_NAV,
  STAFF_BOTTOM_NAV,
  navItemVisible,
  type Permission,
  type PermissionSet,
  type NavAccent,
} from "@/lib/permissions";

type StaffSidebarProps = {
  role: string;
  name: string;
  profilePicture?: string;
  permissions?: PermissionSet;
  canUsePatronContext?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

const NAV_ICONS: Record<string, React.ElementType> = {
  "/dashboard": LayoutDashboard,
  "/tasks": ListTodo,
  "/bookings": CalendarDays,
  "/checkin": ClipboardCheck,
  "/ceremony-codes": KeyRound,
  "/bookings/content": FileText,
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

export default function StaffSidebar({ role, name, profilePicture, permissions, canUsePatronContext = false, isOpen = false, onClose, collapsed = false, onToggleCollapse }: StaffSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = getInitials(name);

  useEffect(() => { onClose?.(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pathname]);

  function hasPerm(p: Permission): boolean {
    if (role === "SUPER_ADMIN") return true;
    return permissions?.[p] ?? false;
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  async function handlePatronContext() {
    const result = await switchToPatronContext();
    if (result.success && result.redirectTo) router.push(result.redirectTo);
  }

  const renderSidebar = (compact: boolean, desktop: boolean) => (
    <aside
      className={cn(
        "bg-[hsl(var(--sb-bg))] border-r border-[hsl(var(--sb-border))] flex flex-col flex-shrink-0 relative overflow-hidden h-full transition-[width] duration-200",
        compact ? "w-[68px]" : "w-[240px]"
      )}
    >
      <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-[radial-gradient(circle,rgba(255,77,107,0.10)_0%,transparent_70%)] pointer-events-none" />

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

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4 scrollbar-thin">
        {STAFF_NAV_GROUPS.map((group) => {
          const visible = group.items.filter((item) => navItemVisible(item, role, hasPerm));
          if (visible.length === 0) return null;
          return (
            <div key={group.label ?? "core"}>
              {group.label && !compact && (
                <p className="px-3 mb-1 text-[0.58rem] font-bold uppercase tracking-[0.1em] text-[hsl(var(--sb-muted))]">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visible.map(({ href, label, accent }) => {
                  const Icon = NAV_ICONS[href] ?? LayoutDashboard;
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
              {STAFF_ADMIN_NAV.map(({ href, label }) => {
                const Icon = NAV_ICONS[href] ?? Users;
                const isActive = pathname === href || pathname.startsWith(`${href}/`);
                return <NavItem key={href} href={href} label={label} Icon={Icon} isActive={isActive} compact={compact} />;
              })}
            </div>
          </div>
        )}

        <div className="space-y-0.5">
          {STAFF_BOTTOM_NAV.filter((item) => navItemVisible(item, role, hasPerm)).map(({ href, label }) => {
            const Icon = NAV_ICONS[href] ?? UserCircle;
            const isActive = pathname === href;
            return <NavItem key={href} href={href} label={label} Icon={Icon} isActive={isActive} compact={compact} />;
          })}
        </div>
      </nav>

      <div className="p-3 border-t border-[hsl(var(--sb-border))]">
        {canUsePatronContext && (
          <button
            onClick={handlePatronContext}
            title={compact ? "Switch to Patron Portal" : undefined}
            className={cn("w-full flex items-center gap-2.5 px-3 py-2 mb-1 rounded-lg text-[0.82rem] font-medium text-[hsl(var(--sb-fg))] hover:text-[hsl(var(--sb-fg-strong))] hover:bg-[hsl(var(--sb-hover-bg))]", compact && "justify-center px-0")}
          >
            <Repeat2 size={15} /> {!compact && "Switch to Patron Portal"}
          </button>
        )}
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
      <div className="hidden lg:flex flex-shrink-0 h-full">
        {renderSidebar(collapsed, true)}
      </div>

      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(15,17,20,0.62)] backdrop-blur-sm"
          />
          <div className="relative h-full z-[51] flex flex-col animate-[slideInSidebar_0.22s_ease-out]">
            {renderSidebar(false, false)}
          </div>
        </div>
      )}
    </>
  );
}
