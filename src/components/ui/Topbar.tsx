"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, Search } from "lucide-react";
import Image from "next/image";
import PushNotificationToggle from "@/components/layout/PushNotificationToggle";
import { areasFor, crumbsFor, ROLE_LABELS } from "@/components/staff-shell/nav";
import type { PermissionSet } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const ROUND_BUTTON =
  "flex size-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card text-[var(--muted)] shadow-[var(--shadow-xs)] transition-colors hover:text-[var(--navy)]";

/** Where you are (group › page), search, notifications. The account menu lives in the sidebar. */
export default function Topbar({
  name,
  role,
  profilePicture,
  permissions,
  onMenuToggle,
  onSearch,
}: {
  name: string;
  role: string;
  profilePicture?: string;
  permissions?: PermissionSet;
  onMenuToggle?: () => void;
  onSearch?: () => void;
}) {
  const pathname = usePathname();
  const crumbs = crumbsFor(pathname);
  const areas = areasFor(pathname, role, permissions);
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex-shrink-0 bg-background/85 backdrop-blur-md lg:pt-3">
      <div className="flex h-14 w-full items-center gap-2 px-3 sm:px-6 lg:h-16 lg:px-8">
        {onMenuToggle && (
          <button type="button" onClick={onMenuToggle} className={`${ROUND_BUTTON} lg:hidden`} aria-label="Open menu">
            <Menu size={18} />
          </button>
        )}

        {/* Wide screens: the console's areas as pills. Narrower: breadcrumbs. */}
        <div className="hidden min-w-0 flex-1 2xl:block">
          <nav
            aria-label="Portal areas"
            className="inline-flex items-center gap-0.5 rounded-full border border-border/70 bg-card p-1 shadow-[var(--shadow-xs)]"
          >
            {areas.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                aria-current={a.active ? "true" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  a.active
                    ? "bg-[hsl(var(--btn))] text-[hsl(var(--btn-foreground))] shadow-[var(--shadow-xs)]"
                    : "text-[var(--muted)] hover:bg-muted hover:text-[var(--navy)]"
                )}
              >
                {a.label}
              </Link>
            ))}
          </nav>
        </div>

        <nav aria-label="Breadcrumb" className="min-w-0 flex-1 overflow-hidden 2xl:hidden">
          <ol className="flex min-w-0 items-center gap-1.5 text-sm">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={`${c.label}-${i}`} className={`flex min-w-0 items-center gap-1.5 ${!last && i === 0 && crumbs.length > 2 ? "hidden sm:flex" : ""}`}>
                  {i > 0 && <ChevronRight size={14} className="shrink-0 text-[var(--muted)] opacity-60" />}
                  {c.href && !last ? (
                    <Link href={c.href} className="truncate text-[var(--muted)] transition-colors hover:text-[var(--navy)]">
                      {c.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={last ? "page" : undefined}
                      className={last ? "truncate font-medium text-[var(--navy)]" : "truncate text-[var(--muted)]"}
                    >
                      {c.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {onSearch && (
          <>
            <button
              type="button"
              onClick={onSearch}
              className="hidden h-10 items-center gap-2 rounded-full border border-border/70 bg-card px-4 text-sm text-[var(--muted)] shadow-[var(--shadow-xs)] transition-colors hover:text-[var(--navy)] md:flex"
              aria-label="Search pages and actions"
            >
              <Search size={16} />
              <span>Search pages and actions…</span>
              <kbd className="ml-4 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
            </button>
            <button type="button" onClick={onSearch} className={`${ROUND_BUTTON} md:hidden`} aria-label="Search pages and actions">
              <Search size={18} />
            </button>
          </>
        )}

        <PushNotificationToggle compact />

        <Link
          href="/profile"
          title={`${name} · ${ROLE_LABELS[role] ?? role}`}
          aria-label="My profile"
          className="shrink-0 rounded-full shadow-[var(--shadow-xs)] lg:hidden"
        >
          {profilePicture ? (
            <Image src={profilePicture} alt={name} width={40} height={40} unoptimized className="size-10 rounded-full object-cover" />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-card text-[0.75rem] font-semibold text-[var(--navy)]">
              {initials}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
