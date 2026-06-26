"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Boxes, ListTodo, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

/** Highest-frequency staff destinations for thumb reach on mobile. */
const ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
] as const;

/**
 * Bottom tab bar shown only below `lg`, complementing the sidebar drawer.
 * "More" opens the full sidebar via the same toggle the Topbar hamburger uses.
 */
export default function MobileBottomNav({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed z-40 left-3 right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-stretch overflow-hidden rounded-xl border border-[var(--border)] bg-white/95 backdrop-blur-md shadow-[0_8px_30px_rgba(22,26,31,0.14)] dark:bg-[rgba(22,24,28,0.94)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.55)]"
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.62rem] font-medium transition-colors",
              active ? "text-[var(--gold)]" : "text-[var(--muted)] hover:text-[var(--navy)]"
            )}
          >
            <Icon size={20} className={active ? "opacity-100" : "opacity-70"} />
            <span>{label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMenuToggle}
        aria-label="Open menu"
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.62rem] font-medium text-[var(--muted)] transition-colors hover:text-[var(--navy)]"
      >
        <Menu size={20} className="opacity-70" />
        <span>More</span>
      </button>
    </nav>
  );
}
