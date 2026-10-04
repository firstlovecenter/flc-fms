"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ShieldCheck, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { PUBLIC_NAV, type PublicNavPage } from "@/components/public/public-nav";

type Variant = "split" | "top";

/** Uppercase, letter-spaced entries, as on anagkazo-campus.com. */
const LINK_BASE =
  "whitespace-nowrap text-[0.72rem] font-semibold uppercase tracking-[0.12em] no-underline transition-colors";

export default function PublicSiteNav({
  current,
  variant = "split",
  showBookCta = true,
}: {
  current?: PublicNavPage;
  variant?: Variant;
  /** Hide primary CTA on the booking flow itself */
  showBookCta?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const isTop = variant === "top";
  const desktopNavClass = isTop ? "md:flex" : "lg:flex";
  const mobileOnlyClass = isTop ? "md:hidden" : "lg:hidden";

  // Close the dropdown on outside click and on Escape.
  useEffect(() => {
    if (!openGroup) return;
    function onPointerDown(event: MouseEvent) {
      if (groupRef.current && !groupRef.current.contains(event.target as Node)) {
        setOpenGroup(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenGroup(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openGroup]);

  const linkClass = (active: boolean) =>
    cn(
      LINK_BASE,
      active
        ? "text-[var(--gold-muted)]"
        : "text-[var(--navy)] hover:text-[var(--gold-muted)]"
    );

  const mobileLinkClass = (active: boolean) =>
    cn(
      "flex items-center rounded-lg px-3.5 py-3 text-[0.78rem] font-semibold uppercase tracking-[0.12em] no-underline transition-colors",
      active
        ? "bg-[var(--cream)] text-[var(--gold-muted)]"
        : "text-[var(--navy)] hover:bg-[var(--cream)]"
    );

  return (
    <>
      <div className="flex w-full min-w-0 items-center justify-between gap-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 no-underline"
          aria-label="First Love Center home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--navy)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          <span
            className="hidden truncate text-[1.05rem] text-[var(--navy)] sm:inline"
            style={{ fontFamily: "var(--font-display)" }}
          >
            First Love Center
          </span>
        </Link>

        {/* Desktop links */}
        <nav
          ref={groupRef}
          className={cn("hidden min-w-0 items-center gap-7", desktopNavClass)}
          aria-label="Campus services"
        >
          {PUBLIC_NAV.map((node) => {
            if (node.kind === "link") {
              return (
                <Link
                  key={node.href}
                  href={node.href}
                  className={linkClass(current === node.id)}
                >
                  {node.label}
                </Link>
              );
            }

            const groupActive = node.items.some((item) => current === item.id);
            const isOpen = openGroup === node.key;

            return (
              <div key={node.key} className="relative">
                <button
                  type="button"
                  className={cn(linkClass(groupActive), "inline-flex items-center gap-1")}
                  onClick={() => setOpenGroup(isOpen ? null : node.key)}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                >
                  {node.label}
                  <ChevronDown
                    size={13}
                    aria-hidden
                    className={cn("transition-transform duration-200", isOpen && "rotate-180")}
                  />
                </button>

                {isOpen && (
                  <div className="absolute left-1/2 top-full z-30 mt-3 w-72 -translate-x-1/2 overflow-hidden rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-lg)] animate-slide-in-down">
                    {node.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenGroup(null)}
                        className="block rounded-[var(--r-md)] px-3.5 py-2.5 no-underline transition-colors hover:bg-[var(--cream)]"
                      >
                        <span
                          className="block text-[0.95rem] text-[var(--navy)]"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {item.label}
                        </span>
                        {item.description && (
                          <span className="mt-0.5 block text-xs leading-snug text-[var(--text-muted)]">
                            {item.description}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/login"
            className={cn(LINK_BASE, "hidden items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--navy)] lg:inline-flex")}
          >
            <ShieldCheck size={14} aria-hidden />
            Staff
          </Link>
          {showBookCta && current !== "guest" && (
            <Link
              href="/guest/book"
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "h-10 px-5 text-[0.72rem] font-semibold uppercase tracking-[0.12em]"
              )}
            >
              <span className="hidden sm:inline">Plan your visit</span>
              <span className="sm:hidden">Plan visit</span>
            </Link>
          )}
          <button
            type="button"
            className={cn(
              mobileOnlyClass,
              "flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--navy)]"
            )}
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="public-mobile-menu"
          className={cn(
            mobileOnlyClass,
            "mt-3 flex flex-col gap-0.5 border-t border-[var(--border)] pt-3 animate-fade-in"
          )}
        >
          {PUBLIC_NAV.map((node) => {
            if (node.kind === "link") {
              return (
                <Link
                  key={node.href}
                  href={node.href}
                  className={mobileLinkClass(current === node.id)}
                  onClick={() => setMenuOpen(false)}
                >
                  {node.label}
                </Link>
              );
            }

            return (
              <div key={node.key} className="py-1">
                <p className="px-3.5 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  {node.label}
                </p>
                {node.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(mobileLinkClass(current === item.id), "pl-6 normal-case tracking-normal")}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span style={{ fontFamily: "var(--font-display)" }} className="text-[0.95rem]">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            );
          })}

          <div className="my-2 h-px bg-[var(--border)]" />
          <Link
            href="/feedback"
            className={mobileLinkClass(current === "feedback")}
            onClick={() => setMenuOpen(false)}
          >
            Share feedback
          </Link>
          <Link
            href="/login"
            className={mobileLinkClass(false)}
            onClick={() => setMenuOpen(false)}
          >
            Staff access
          </Link>
        </div>
      )}
    </>
  );
}
