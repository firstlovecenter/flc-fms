"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, LayoutGrid, LogOut, Repeat2, Search, UserCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { logout, switchToPatronContext } from "@/actions/auth.actions";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  STAFF_NAV_GROUPS,
  STAFF_ADMIN_NAV,
  STAFF_BOTTOM_NAV,
  navItemVisible,
  type Permission,
  type PermissionSet,
} from "@/lib/permissions";
import { NAV_ICONS, ROLE_LABELS, isNavItemActive } from "@/components/staff-shell/nav";

/** Tab candidates in priority order; the first three this person can open become tabs. */
const TAB_PRIORITY: { href: string; label: string }[] = [
  { href: "/bookings", label: "Bookings" },
  { href: "/checkin", label: "Check-in" },
  { href: "/tasks", label: "Tasks" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/inventory", label: "Inventory" },
  { href: "/transactions", label: "Finance" },
  { href: "/duty", label: "Duty" },
  { href: "/facilities", label: "Facilities" },
];

type Item = { href: string; label: string; icon: LucideIcon };

const tabClass =
  "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-[0.65rem] font-medium transition-colors";

/**
 * Phones (below lg): a floating pill tab bar with Home and the three sections
 * this person can open that matter most day to day. "More" opens a launcher
 * with every section they can reach as a tile, plus search and their account.
 */
export default function MobileBottomNav({
  role,
  name,
  permissions,
  canUsePatronContext = false,
  launcherOpen,
  onLauncherChange,
  onSearch,
}: {
  role: string;
  name: string;
  permissions?: PermissionSet;
  canUsePatronContext?: boolean;
  launcherOpen: boolean;
  onLauncherChange: (open: boolean) => void;
  onSearch: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => { onLauncherChange(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pathname]);

  const hasPerm = (p: Permission) => role === "SUPER_ADMIN" || (permissions?.[p] ?? false);
  const allItems = STAFF_NAV_GROUPS.flatMap((g) => g.items);
  const canOpen = (href: string) => {
    const item = allItems.find((i) => i.href === href);
    return !!item && navItemVisible(item, role, hasPerm);
  };

  const tabs: Item[] = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    ...TAB_PRIORITY.filter((t) => canOpen(t.href))
      .slice(0, 3)
      .map((t) => ({ ...t, icon: NAV_ICONS[t.href] ?? LayoutDashboard })),
  ];

  const groups = [
    ...STAFF_NAV_GROUPS.map((g) => ({
      label: g.label ?? "Overview",
      items: g.items.filter((i) => navItemVisible(i, role, hasPerm)),
    })),
    ...(role === "SUPER_ADMIN" ? [{ label: "Administration", items: STAFF_ADMIN_NAV }] : []),
    { label: "Account", items: STAFF_BOTTOM_NAV.filter((i) => navItemVisible(i, role, hasPerm)) },
  ].filter((g) => g.items.length > 0);

  const moreActive = !tabs.some((t) => isNavItemActive(pathname, t.href));

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  async function handlePatronContext() {
    const result = await switchToPatronContext();
    if (result.success && result.redirectTo) router.push(result.redirectTo);
  }

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex items-stretch gap-1 rounded-full border border-border/70 bg-card/95 p-1.5 shadow-[0_12px_32px_-12px_rgb(28_25_23/0.3)] backdrop-blur-md lg:hidden"
      >
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                tabClass,
                active ? "bg-[hsl(var(--btn))] text-[hsl(var(--btn-foreground))]" : "text-[var(--muted)] hover:text-[var(--navy)]"
              )}
            >
              <Icon size={19} className={active ? "opacity-100" : "opacity-80"} />
              <span className="max-w-full truncate px-1">{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => onLauncherChange(true)}
          aria-label="All sections"
          aria-expanded={launcherOpen}
          className={cn(
            tabClass,
            moreActive && !launcherOpen
              ? "bg-[hsl(var(--btn))] text-[hsl(var(--btn-foreground))]"
              : "text-[var(--muted)] hover:text-[var(--navy)]"
          )}
        >
          <LayoutGrid size={19} className="opacity-80" />
          <span>More</span>
        </button>
      </nav>

      <Sheet open={launcherOpen} onOpenChange={onLauncherChange}>
        <SheetContent
          side="bottom"
          className="max-h-[88dvh] gap-0 overflow-y-auto rounded-t-[1.75rem] border-t-0 bg-background p-0 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border" />
          <div className="px-4 pt-3">
            <SheetTitle className="text-lg font-medium tracking-tight">All sections</SheetTitle>
            <SheetDescription className="sr-only">Every part of the staff portal you can open.</SheetDescription>

            <button
              type="button"
              onClick={() => {
                onLauncherChange(false);
                onSearch();
              }}
              className="mt-3 flex h-11 w-full items-center gap-3 rounded-full border border-border/70 bg-card px-4 text-sm text-[var(--muted)] shadow-[var(--shadow-xs)]"
            >
              <Search size={17} /> Search pages and actions
            </button>
          </div>

          <div className="space-y-5 px-4 pt-5">
            {groups.map((group) => (
              <section key={group.label}>
                <h3 className="mb-2 px-1 text-xs font-medium text-[var(--muted)]">{group.label}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {group.items.map(({ href, label }) => {
                    const Icon = NAV_ICONS[href] ?? UserCircle;
                    const active = isNavItemActive(pathname, href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-[4.75rem] flex-col items-center justify-center gap-1.5 rounded-2xl border px-1.5 py-2.5 text-center text-[0.72rem] font-medium leading-tight transition-colors",
                          active
                            ? "border-transparent bg-[hsl(var(--btn))] text-[hsl(var(--btn-foreground))]"
                            : "border-border/70 bg-card text-[var(--navy)] shadow-[var(--shadow-xs)] active:bg-muted"
                        )}
                      >
                        <Icon size={20} className={active ? "" : "text-[var(--muted)]"} />
                        <span className="line-clamp-2">{label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}

            <section className="rounded-[1.25rem] border border-border/70 bg-card p-1.5 shadow-[var(--shadow-xs)]">
              <div className="flex items-center gap-2.5 px-2.5 py-2">
                <span className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-[var(--navy)]">
                  {name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--navy)]">{name}</p>
                  <p className="text-xs text-[var(--muted)]">{ROLE_LABELS[role] ?? role.replace(/_/g, " ")}</p>
                </div>
              </div>
              {canUsePatronContext && (
                <button type="button" onClick={handlePatronContext} className="flex h-11 w-full items-center gap-2.5 rounded-xl px-2.5 text-sm font-medium text-[var(--navy)] active:bg-muted">
                  <Repeat2 size={17} className="text-[var(--muted)]" /> Switch to patron portal
                </button>
              )}
              <button type="button" onClick={handleLogout} className="flex h-11 w-full items-center gap-2.5 rounded-xl px-2.5 text-sm font-medium text-danger active:bg-danger/5">
                <LogOut size={17} /> Sign out
              </button>
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
