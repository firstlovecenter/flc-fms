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

const itemClass =
  "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-[0.65rem] font-medium transition-colors";

/**
 * Floating pill tab bar shown only below `lg`, complementing the sidebar drawer.
 * The current page is the ink pill, as in the sidebar. "More" opens the full
 * sidebar via the same toggle the header's menu button uses.
 */
export default function MobileBottomNav({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex items-stretch gap-1 rounded-full border border-border/70 bg-card/95 p-1.5 shadow-[0_12px_32px_-12px_rgb(28_25_23/0.3)] backdrop-blur-md lg:hidden"
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
              itemClass,
              active
                ? "bg-[hsl(var(--btn))] text-[hsl(var(--btn-foreground))]"
                : "text-[var(--muted)] hover:text-[var(--navy)]"
            )}
          >
            <Icon size={19} className={active ? "opacity-100" : "opacity-80"} />
            <span>{label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMenuToggle}
        aria-label="Open menu"
        className={cn(itemClass, "text-[var(--muted)] hover:text-[var(--navy)]")}
      >
        <Menu size={19} className="opacity-80" />
        <span>More</span>
      </button>
    </nav>
  );
}
