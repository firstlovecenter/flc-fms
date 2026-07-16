"use client";

import Link from "next/link";
import { LogOut, Menu, X, Repeat2 } from "lucide-react";
import { logout, switchToStaffContext } from "@/actions/auth.actions";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import PushNotificationToggle from "@/components/layout/PushNotificationToggle";
import { ThemeModeSwitcher } from "@/components/theme/theme-mode-switcher";

interface PatronNavbarProps {
  initials: string;
  name: string;
  canUseStaffContext?: boolean;
}

const NAV = [
  { href: "/patron/dashboard", label: "Dashboard" },
  { href: "/patron/book",      label: "Book" },
  { href: "/patron/bookings",  label: "My Bookings" },
  { href: "/patron/profile",   label: "Profile" },
];

export default function PatronNavbar({ initials, name, canUseStaffContext = false }: PatronNavbarProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  async function handleLogout() {
    await logout();
    router.push("/patron/login");
  }

  async function handleStaffContext() {
    const result = await switchToStaffContext();
    if (result.success && result.redirectTo) router.push(result.redirectTo);
  }

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white dark:bg-[rgba(10,17,29,0.88)] border-b border-[var(--border)] backdrop-blur-[16px] shadow-[var(--shadow-xs)]">
        <div className="max-w-[1100px] mx-auto px-5 h-[60px] flex items-center justify-between">

          {/* Logo */}
          <Link href="/patron/dashboard" className="flex items-center gap-2.5 no-underline group">
            <div className="w-8 h-8 rounded-lg bg-[var(--navy)] flex items-center justify-center flex-shrink-0 transition-colors duration-200 group-hover:bg-[var(--navy-mid)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span className="font-bold text-[var(--navy)] leading-none text-base" style={{ fontFamily: "var(--font-display)" }}>
              <span className="hidden sm:inline">First Love Center</span>
              <span className="sm:hidden">FLC</span>
            </span>
          </Link>

          {/* Center nav — desktop */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV.map(({ href, label }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative px-3.5 py-1.5 rounded-full text-[0.82rem] transition-all duration-150 no-underline",
                    isActive
                      ? "font-semibold text-[var(--navy)] bg-[var(--cream-dark)]"
                      : "font-medium text-[var(--slate)] hover:text-[var(--navy)] hover:bg-[var(--cream)]"
                  )}
                >
                  {label}
                  {isActive && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--gold)]" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* User + logout — desktop */}
            <div className="hidden md:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--navy)] text-[var(--gold-bright)] flex items-center justify-center text-[0.7rem] font-bold flex-shrink-0">
                {initials}
              </div>
              <span className="text-[0.82rem] font-semibold text-[var(--navy)]">{name.split(" ")[0]}</span>
            </div>
            <div className="hidden md:block w-px h-5 bg-[var(--border)]" />
            <ThemeModeSwitcher />
            <PushNotificationToggle />
            {canUseStaffContext && (
              <button onClick={handleStaffContext} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.8rem] font-medium text-[var(--navy)] hover:bg-[var(--cream-dark)] bg-transparent border-0 cursor-pointer">
                <Repeat2 size={13} /> Staff Portal
              </button>
            )}
            <div className="hidden md:block w-px h-5 bg-[var(--border)]" />
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.8rem] font-medium text-[var(--muted)] hover:text-[var(--slate)] hover:bg-[var(--cream-dark)] transition-colors border-0 bg-transparent cursor-pointer"
            >
              <LogOut size={13} /> Sign Out
            </button>

            {/* Hamburger — mobile */}
            <button
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--cream-dark)] border border-[var(--border)] text-[var(--navy)] cursor-pointer"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[var(--border)] px-5 pb-4 pt-3 bg-white dark:bg-[rgba(10,17,29,0.95)] flex flex-col gap-0.5 animate-fade-in">
            {NAV.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-[0.9rem] no-underline transition-colors",
                    isActive
                      ? "font-semibold text-[var(--navy)] bg-[var(--cream-dark)]"
                      : "font-normal text-[var(--slate)] hover:text-[var(--navy)] hover:bg-[var(--cream)]"
                  )}
                >
                  {label}
                  {isActive && <span className="w-1 h-1 rounded-full bg-[var(--gold)]" aria-hidden />}
                </Link>
              );
            })}
            <div className="h-px bg-[var(--border)] my-2" />
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[0.65rem] font-bold flex-shrink-0"
                  style={{ background: "var(--navy)", color: "var(--gold-bright)" }}
                >
                  {initials}
                </div>
                <span className="text-[0.85rem] font-semibold text-[var(--navy)]">{name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.8rem] font-medium text-[var(--muted)] hover:text-[var(--slate)] bg-transparent border-0 cursor-pointer"
              >
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
