"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, CalendarPlus, Home, LogOut, Repeat2, UserCircle, type LucideIcon } from "lucide-react";
import { logout, switchToStaffContext } from "@/actions/auth.actions";
import { cn } from "@/lib/utils";
import PushNotificationToggle from "@/components/layout/PushNotificationToggle";
import { useStackedTables } from "@/components/ui/useStackedTables";

interface PatronNavbarProps {
  initials: string;
  name: string;
  profilePicture?: string;
  canUseStaffContext?: boolean;
}

const NAV: { href: string; label: string; short: string; icon: LucideIcon }[] = [
  { href: "/patron/dashboard", label: "Home",        short: "Home",     icon: Home },
  { href: "/patron/book",      label: "Book",        short: "Book",     icon: CalendarPlus },
  { href: "/patron/bookings",  label: "My bookings", short: "Bookings", icon: CalendarDays },
  { href: "/patron/profile",   label: "Profile",     short: "Profile",  icon: UserCircle },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Avatar({ initials, name, profilePicture, size = 40 }: { initials: string; name: string; profilePicture?: string; size?: number }) {
  return profilePicture ? (
    <Image src={profilePicture} alt={name} width={size} height={size} unoptimized className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      className="flex items-center justify-center rounded-full border border-border/70 bg-card text-[0.75rem] font-semibold text-[var(--navy)]"
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );
}

/**
 * The patron portal's chrome: a sticky header with the brand, the sections as
 * a pill segment control (ink pill for the current one) and an account menu;
 * on phones the sections move to a floating pill tab bar at the bottom.
 */
export default function PatronNavbar({ initials, name, profilePicture, canUseStaffContext = false }: PatronNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  useStackedTables("main");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleLogout() {
    await logout();
    router.push("/patron/login");
  }

  async function handleStaffContext() {
    const result = await switchToStaffContext();
    if (result.success && result.redirectTo) router.push(result.redirectTo);
  }

  const menuItem =
    "flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-[var(--navy)] transition-colors hover:bg-muted";

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center gap-3 px-4 sm:px-7">
          {/* Brand */}
          <Link href="/patron/dashboard" className="flex min-w-0 items-center gap-2.5 no-underline">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--hero-from))] to-[hsl(var(--hero-to))] text-[#fff] shadow-[0_6px_16px_-6px_hsl(var(--hero-to)/0.6)]">
              <Home className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold leading-none tracking-tight text-[var(--navy)]">
                First Love Center
              </span>
              <span className="mt-1 block text-[11px] font-medium leading-none text-[var(--muted)]">Patron portal</span>
            </span>
          </Link>

          {/* Sections — desktop */}
          <nav
            aria-label="Patron"
            className="mx-auto hidden items-center gap-0.5 rounded-full border border-border/70 bg-card p-1 shadow-[var(--shadow-xs)] md:flex"
          >
            {NAV.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium no-underline transition-colors",
                    active
                      ? "bg-[hsl(var(--btn))] text-[hsl(var(--btn-foreground))] shadow-[var(--shadow-xs)]"
                      : "text-[var(--muted)] hover:bg-muted hover:text-[var(--navy)]"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right */}
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <PushNotificationToggle compact />
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
                className="flex items-center gap-2 rounded-full shadow-[var(--shadow-xs)] md:border md:border-border/70 md:bg-card md:py-0.5 md:pl-0.5 md:pr-3"
              >
                <Avatar initials={initials} name={name} profilePicture={profilePicture} size={36} />
                <span className="hidden text-sm font-medium text-[var(--navy)] md:inline">{name.split(" ")[0]}</span>
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-60 rounded-2xl border border-border/70 bg-popover p-1.5 shadow-[0_16px_40px_-16px_rgb(28_25_23/0.3)] animate-slide-in-down"
                >
                  <div className="px-3 pb-2 pt-1.5">
                    <p className="truncate text-sm font-semibold text-[var(--navy)]">{name}</p>
                    <p className="text-xs text-[var(--muted)]">Patron</p>
                  </div>
                  <div className="my-1 h-px bg-border/70" />
                  <Link href="/patron/profile" role="menuitem" className={cn(menuItem, "no-underline")}>
                    <UserCircle size={16} className="text-[var(--muted)]" /> Profile
                  </Link>
                  {canUseStaffContext && (
                    <button type="button" role="menuitem" onClick={handleStaffContext} className={menuItem}>
                      <Repeat2 size={16} className="text-[var(--muted)]" /> Switch to staff portal
                    </button>
                  )}
                  <button type="button" role="menuitem" onClick={handleLogout} className={menuItem}>
                    <LogOut size={16} className="text-[var(--muted)]" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sections — phones */}
      <nav
        aria-label="Patron"
        className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex items-stretch gap-1 rounded-full border border-border/70 bg-card/95 p-1.5 shadow-[0_12px_32px_-12px_rgb(28_25_23/0.3)] backdrop-blur-md md:hidden"
      >
        {NAV.map(({ href, short, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-[0.65rem] font-medium no-underline transition-colors",
                active
                  ? "bg-[hsl(var(--btn))] text-[hsl(var(--btn-foreground))]"
                  : "text-[var(--muted)] hover:text-[var(--navy)]"
              )}
            >
              <Icon size={19} className={active ? "opacity-100" : "opacity-80"} />
              <span>{short}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
