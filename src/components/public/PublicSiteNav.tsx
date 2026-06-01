"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeModeSwitcher } from "@/components/theme/theme-mode-switcher";
import { cn } from "@/lib/utils";
import { PUBLIC_NAV_ITEMS, type PublicNavPage } from "@/components/public/public-nav";

type Variant = "split" | "top";

export default function PublicSiteNav({
  current,
  variant = "split",
  showBookCta = true,
}: {
  current?: PublicNavPage;
  variant?: Variant;
  /** Hide primary Book CTA on guest booking flow */
  showBookCta?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isTop = variant === "top";
  const desktopNavClass = isTop ? "md:flex" : "lg:flex";
  const mobileOnlyClass = isTop ? "md:hidden" : "lg:hidden";

  const linkClass = (active: boolean) =>
    cn(
      isTop
        ? "px-4 py-1.5 rounded-full text-[0.85rem] font-medium no-underline transition-all duration-150"
        : "btn-ghost px-3 py-2 text-xs sm:text-sm transition-colors",
      active
        ? isTop
          ? "bg-[rgba(10,22,40,0.08)] dark:bg-[rgba(255,255,255,0.1)] text-[var(--navy)] dark:text-white font-semibold"
          : "text-[var(--navy)] dark:text-white font-semibold"
        : isTop
          ? "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-white hover:bg-[rgba(10,22,40,0.04)] dark:hover:bg-[rgba(255,255,255,0.06)]"
          : "text-[var(--muted)] hover:text-[var(--navy)] dark:hover:text-white"
    );

  const mobileLinkClass = (active: boolean) =>
    cn(
      "flex items-center px-3.5 py-2.5 rounded-lg text-[0.9rem] no-underline transition-colors",
      active
        ? "font-semibold text-[var(--navy)] dark:text-white bg-[rgba(10,22,40,0.06)] dark:bg-[rgba(255,255,255,0.08)] border-l-2 border-l-[var(--gold)]"
        : "font-normal text-[var(--slate)] dark:text-[rgba(232,238,248,0.75)] hover:text-[var(--navy)] dark:hover:text-white hover:bg-[rgba(10,22,40,0.04)] dark:hover:bg-[rgba(255,255,255,0.05)]"
    );

  return (
    <>
      <div className={cn("flex items-center gap-2 min-w-0", isTop ? "justify-between w-full" : "justify-between")}>
        {isTop ? (
          <Link href="/" className="no-underline flex-shrink-0" aria-label="Home">
            <div className="w-9 h-9 rounded-[10px] bg-[var(--navy)] border border-[rgba(10,22,40,0.12)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
          </Link>
        ) : (
          <Link
            href="/"
            className="flex items-center gap-2 no-underline shrink-0 min-w-0"
            aria-label="First Love Center home"
          >
            <div className="w-8 h-8 rounded-[9px] bg-[var(--navy)] flex items-center justify-center flex-shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span className="text-[0.9rem] font-semibold text-[var(--navy)] dark:text-white truncate" style={{ fontFamily: "var(--font-display)" }}>
              FLC
            </span>
          </Link>
        )}

        {/* Desktop links */}
        <div
          className={cn(
            "hidden items-center min-w-0",
            desktopNavClass,
            isTop
              ? "gap-0.5 rounded-full border border-[rgba(10,22,40,0.1)] dark:border-[rgba(255,255,255,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)] px-1.5 py-1"
              : "gap-0.5 flex-1 justify-center flex-wrap"
          )}
        >
          {PUBLIC_NAV_ITEMS.map(({ href, id, label }) => (
            <Link key={id} href={href} className={cn(linkClass(current === id), "shrink-0")}>
              {label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link href="/login" className="hidden sm:inline-flex btn-secondary text-[0.85rem] px-3 py-2">
            Sign In
          </Link>
          <ThemeModeSwitcher />
          {showBookCta && current !== "guest" && (
            <Link
              href="/guest/book"
              className="btn-primary inline-flex items-center gap-1 text-[0.8rem] sm:text-[0.85rem] px-3 py-2"
            >
              <span className="hidden sm:inline">Book Now</span>
              <span className="sm:hidden">Book</span>
            </Link>
          )}
          <button
            type="button"
            className={cn(
              mobileOnlyClass,
              "w-9 h-9 flex items-center justify-center rounded-lg bg-[rgba(10,22,40,0.06)] dark:bg-[rgba(255,255,255,0.08)] border border-[var(--border)] text-[var(--navy)] dark:text-white cursor-pointer"
            )}
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className={cn(
            mobileOnlyClass,
            "mt-3 pt-3 border-t border-[rgba(10,22,40,0.08)] dark:border-[rgba(255,255,255,0.06)] flex flex-col gap-0.5 animate-fade-in",
            isTop && "pb-1"
          )}
        >
          {PUBLIC_NAV_ITEMS.map(({ href, id, label }) => (
            <Link
              key={id}
              href={href}
              className={mobileLinkClass(current === id)}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="h-px bg-[var(--border)] my-2" />
          <Link
            href="/login"
            className={mobileLinkClass(false)}
            onClick={() => setMenuOpen(false)}
          >
            Sign In
          </Link>
        </div>
      )}
    </>
  );
}
