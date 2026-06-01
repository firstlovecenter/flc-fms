"use client";

import Link from "next/link";
import { ArrowRight, Phone, Mail } from "lucide-react";
import { ThemeModeSwitcher } from "@/components/theme/theme-mode-switcher";
import { cn } from "@/lib/utils";

type CurrentPage = "home" | "guest" | "checkin" | "patron" | "catalog" | "weddings" | "namings" | "ceremony-request";

const NAV_ITEMS: { href: string; id: CurrentPage; label: string }[] = [
  { href: "/",                 id: "home",     label: "Home" },
  { href: "/guest/book",       id: "guest",    label: "Guest Booking" },
  { href: "/guest/checkin",    id: "checkin",  label: "Check-In" },
  { href: "/catalog/weddings", id: "weddings", label: "Weddings" },
  { href: "/catalog/namings",  id: "namings",  label: "Namings" },
];

export default function PublicTopNav({
  current,
  officePhone,
  officeEmail,
}: {
  current?: CurrentPage;
  officePhone?: string;
  officeEmail?: string;
}) {
  return (
    <header className="sticky top-0 z-20 bg-[rgba(255,255,255,0.88)] dark:bg-[rgba(10,18,30,0.85)] backdrop-blur-md border-b border-[rgba(10,22,40,0.08)] dark:border-[rgba(255,255,255,0.07)]">
      <nav className="max-w-7xl mx-auto px-4 sm:px-5 md:px-8 py-3.5 flex items-center justify-between gap-2 sm:gap-3">
        {/* Logo */}
        <Link href="/" className="no-underline flex-shrink-0" aria-label="Home">
          <div className="w-9 h-9 rounded-[10px] bg-[var(--navy)] border border-[rgba(10,22,40,0.12)] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
        </Link>

        {/* Desktop pill nav */}
        <div className="hidden md:flex items-center gap-0.5 rounded-full border border-[rgba(10,22,40,0.1)] dark:border-[rgba(255,255,255,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)] px-1.5 py-1">
          {NAV_ITEMS.map(({ href, id, label }) => (
            <Link
              key={id}
              href={href}
              className={cn(
                "px-4 py-1.5 rounded-full text-[0.85rem] font-medium no-underline transition-all duration-150",
                current === id
                  ? "bg-[rgba(10,22,40,0.08)] dark:bg-[rgba(255,255,255,0.1)] text-[var(--navy)] dark:text-white font-semibold"
                  : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white hover:bg-[rgba(10,22,40,0.04)] dark:hover:bg-[rgba(255,255,255,0.06)]"
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Mobile check-in shortcut */}
          <Link
            href="/guest/checkin"
            className={cn(
              "md:hidden btn-ghost text-xs sm:text-sm px-3 py-2",
              current === "checkin" && "text-[var(--navy)] font-semibold"
            )}
          >
            Check-In
          </Link>

          <Link
            href="/login"
            className="hidden sm:inline-flex btn-secondary text-[0.85rem] px-4 py-2"
          >
            Sign In
          </Link>

          <ThemeModeSwitcher />

          {current !== "guest" && (
            <Link
              href="/guest/book"
              className="btn-primary inline-flex items-center gap-1.5 text-[0.85rem] px-4 py-2"
            >
              <span className="hidden sm:inline">Book Now</span>
              <span className="sm:hidden">Book</span>
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          )}
        </div>
      </nav>

      {(officePhone || officeEmail) && (
        <div className="border-t border-[rgba(10,22,40,0.06)] dark:border-[rgba(255,255,255,0.05)] bg-[rgba(10,22,40,0.02)] dark:bg-[rgba(255,255,255,0.01)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-8 py-1.5 flex items-center gap-4 text-[0.7rem] text-[var(--text-muted)]">
            {officePhone && (
              <a href={`tel:${officePhone}`} className="flex items-center gap-1 hover:text-[var(--navy)] dark:hover:text-white transition-colors">
                <Phone size={11} /> {officePhone}
              </a>
            )}
            {officeEmail && (
              <a href={`mailto:${officeEmail}`} className="flex items-center gap-1 hover:text-[var(--navy)] dark:hover:text-white transition-colors">
                <Mail size={11} /> {officeEmail}
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
