"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import {
  Home,
  LayoutDashboard,
  LogOut,
  X,
  Users,
  UserCircle,
  PanelLeftClose,
  PanelLeft,
  Repeat2,
  Search,
  type LucideIcon,
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
} from "@/lib/permissions";
import { NAV_ICONS, ROLE_LABELS, isNavItemActive } from "@/components/staff-shell/nav";

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
  onSearch?: () => void;
};

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function NavItem({ href, label, Icon, isActive, compact = false }: { href: string; label: string; Icon: LucideIcon; isActive: boolean; compact?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      title={compact ? label : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-full px-3 text-sm font-medium transition-colors",
        isActive
          ? "bg-[hsl(var(--sb-active-bg))] text-[hsl(var(--sb-active-fg))] shadow-[var(--shadow-xs)]"
          : "text-[hsl(var(--sb-fg))] hover:bg-[hsl(var(--sb-hover-bg))] hover:text-[hsl(var(--sb-fg-strong))]",
        compact && "mx-auto w-10 justify-center px-0"
      )}
    >
      <Icon className={cn("size-[18px] shrink-0 transition-opacity", !isActive && "opacity-80 group-hover:opacity-100")} />
      {!compact && <span className="flex-1 truncate">{label}</span>}
      {isActive && !compact && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[hsl(var(--signal))]" />}
    </Link>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 px-3 text-xs font-medium text-[hsl(var(--sb-muted))]">{children}</p>;
}

const footerButton =
  "flex h-9 w-full items-center gap-2.5 rounded-full px-3 text-[0.8rem] font-medium text-[hsl(var(--sb-fg))] transition-colors hover:bg-[hsl(var(--sb-bg))] hover:text-[hsl(var(--sb-fg-strong))]";

export default function StaffSidebar({ role, name, profilePicture, permissions, canUsePatronContext = false, isOpen = false, onClose, collapsed = false, onToggleCollapse, onSearch }: StaffSidebarProps) {
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
        "flex h-full flex-shrink-0 flex-col overflow-hidden bg-[hsl(var(--sb-bg))] transition-[width] duration-200 ease-out",
        compact ? "w-[72px]" : "w-[256px]",
        desktop
          ? "rounded-[1.75rem] border border-[hsl(var(--sb-border))] shadow-[0_1px_2px_rgb(28_25_23/0.04),0_12px_32px_-20px_rgb(28_25_23/0.18)]"
          : "rounded-r-[1.75rem] shadow-[var(--shadow-lg)]"
      )}
    >
      {/* Brand */}
      <div className={cn("flex h-16 shrink-0 items-center", compact ? "justify-center px-3" : "justify-between pl-4 pr-3")}>
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--hero-from))] to-[hsl(var(--hero-to))] text-[#fff] shadow-[0_6px_16px_-6px_hsl(var(--hero-to)/0.6)]">
            <Home className="size-4" />
          </span>
          {!compact && (
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold leading-none tracking-tight text-[hsl(var(--sb-fg-strong))]">
                First Love Center
              </span>
              <span className="mt-1 block text-[11px] font-medium leading-none text-[hsl(var(--sb-muted))]">
                {role === "SUPER_ADMIN" ? "Super admin console" : `${ROLE_LABELS[role] ?? "Staff"} portal`}
              </span>
            </span>
          )}
        </Link>
        {!compact && desktop && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-full p-2 text-[hsl(var(--sb-fg))] transition-colors hover:bg-[hsl(var(--sb-hover-bg))] hover:text-[hsl(var(--sb-fg-strong))]"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
        {onClose && !desktop && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[hsl(var(--sb-fg))] transition-colors hover:bg-[hsl(var(--sb-hover-bg))] hover:text-[hsl(var(--sb-fg-strong))]"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Search + expand */}
      <div className="space-y-2 px-3 pt-1">
        {onSearch && (
          <button
            type="button"
            onClick={() => {
              onClose?.();
              onSearch();
            }}
            aria-label="Search pages and actions"
            title={compact ? "Search (Ctrl K)" : undefined}
            className={cn(
              "flex min-h-10 w-full items-center gap-3 rounded-full border border-[hsl(var(--sb-border))] px-3.5 py-2 text-sm text-[hsl(var(--sb-fg))] transition-colors hover:bg-[hsl(var(--sb-hover-bg))] hover:text-[hsl(var(--sb-fg-strong))]",
              compact && "mx-auto w-10 justify-center px-0"
            )}
          >
            <Search className="size-4 shrink-0" />
            {!compact && (
              <>
                <span className="flex-1 text-left">Search</span>
                <kbd className="rounded-md border border-[hsl(var(--sb-border))] bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                  Ctrl K
                </kbd>
              </>
            )}
          </button>
        )}
        {compact && desktop && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="mx-auto flex size-10 items-center justify-center rounded-full text-[hsl(var(--sb-fg))] transition-colors hover:bg-[hsl(var(--sb-hover-bg))] hover:text-[hsl(var(--sb-fg-strong))]"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeft className="size-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav aria-label="Staff" className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {STAFF_NAV_GROUPS.map((group, gi) => {
          const visible = group.items.filter((item) => navItemVisible(item, role, hasPerm));
          if (visible.length === 0) return null;
          return (
            <div
              key={group.label ?? "core"}
              className={cn(gi > 0 && "mt-5", gi > 0 && compact && "mt-3 border-t border-[hsl(var(--sb-border))] pt-3")}
            >
              {group.label && !compact && <GroupLabel>{group.label}</GroupLabel>}
              <div className="space-y-1">
                {visible.map(({ href, label }) => (
                  <NavItem
                    key={href}
                    href={href}
                    label={label}
                    Icon={NAV_ICONS[href] ?? LayoutDashboard}
                    isActive={isNavItemActive(pathname, href)}
                    compact={compact}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {role === "SUPER_ADMIN" && (
          <div className={cn("mt-5", compact && "mt-3 border-t border-[hsl(var(--sb-border))] pt-3")}>
            {!compact && <GroupLabel>Administration</GroupLabel>}
            <div className="space-y-1">
              {STAFF_ADMIN_NAV.map(({ href, label }) => (
                <NavItem
                  key={href}
                  href={href}
                  label={label}
                  Icon={NAV_ICONS[href] ?? Users}
                  isActive={isNavItemActive(pathname, href)}
                  compact={compact}
                />
              ))}
            </div>
          </div>
        )}

        <div className={cn("mt-5 space-y-1", compact && "mt-3 border-t border-[hsl(var(--sb-border))] pt-3")}>
          {!compact && <GroupLabel>Account</GroupLabel>}
          {STAFF_BOTTOM_NAV.filter((item) => navItemVisible(item, role, hasPerm)).map(({ href, label }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              Icon={NAV_ICONS[href] ?? UserCircle}
              isActive={pathname === href}
              compact={compact}
            />
          ))}
        </div>
      </nav>

      {/* Account */}
      <div className="m-2 mt-0 shrink-0 rounded-[1.25rem] bg-[hsl(var(--sb-hover-bg))] p-1.5">
        <div className={cn("flex items-center gap-2.5 px-1.5 py-1.5", compact && "justify-center px-0")}>
          {profilePicture ? (
            <Image
              src={profilePicture}
              alt={name}
              width={32}
              height={32}
              unoptimized
              className="size-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--sb-bg))] text-[0.72rem] font-semibold text-[hsl(var(--sb-fg-strong))] shadow-[var(--shadow-xs)]">
              {initials}
            </span>
          )}
          {!compact && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.82rem] font-semibold leading-tight text-[hsl(var(--sb-fg-strong))]">{name}</div>
              <div className="mt-0.5 truncate text-[0.7rem] leading-tight text-[hsl(var(--sb-muted))]">
                {ROLE_LABELS[role] ?? role.replace(/_/g, " ")}
              </div>
            </div>
          )}
        </div>
        {!compact && (
          <div className="mt-1 space-y-0.5">
            {canUsePatronContext && (
              <button type="button" onClick={handlePatronContext} className={footerButton}>
                <Repeat2 className="size-4 opacity-80" /> Switch to patron portal
              </button>
            )}
            <PushNotificationToggle row />
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          title={compact ? "Sign out" : undefined}
          aria-label="Sign out"
          className={cn(footerButton, compact && "mx-auto w-9 justify-center px-0")}
        >
          <LogOut className="size-4 opacity-80" /> {!compact && "Sign out"}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden h-full flex-shrink-0 py-3 pl-3 lg:flex">
        {renderSidebar(collapsed, true)}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            onClick={onClose}
            className="absolute inset-0 bg-[rgb(28_25_23/0.4)] backdrop-blur-sm"
          />
          <div className="relative z-[51] flex h-full flex-col animate-[slideInSidebar_0.22s_ease-out]">
            {renderSidebar(false, false)}
          </div>
        </div>
      )}
    </>
  );
}
