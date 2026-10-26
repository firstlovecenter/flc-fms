"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type Accent =
  | "gold"
  | "bookings"
  | "facilities"
  | "inventory"
  | "maintenance"
  | "finance"
  | "duty"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "blue"
  | "green"
  | "red"
  | "yellow"
  | "gray";

interface StatCardProps {
  label: string;
  value: string | number;
  /** Domain accent — colors the icon so the tile reads as part of its area */
  color?: Accent;
  sub?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  href?: string;
  loading?: boolean;
  /** Compact layout for mobile stat rows */
  compact?: boolean;
  /**
   * The orange gradient tile with white text. One per page at most, for the
   * number that matters most there.
   */
  hero?: boolean;
}

const LEGACY_ALIAS: Partial<Record<Accent, Accent>> = {
  blue: "bookings",
  green: "finance",
  red: "danger",
  yellow: "warning",
  gray: "neutral",
};

const ACCENT_ICON: Record<string, string> = {
  gold:        "text-gold",
  bookings:    "text-bookings",
  facilities:  "text-facilities",
  inventory:   "text-inventory",
  maintenance: "text-maintenance",
  finance:     "text-finance",
  duty:        "text-duty",
  success:     "text-success",
  warning:     "text-warning",
  danger:      "text-danger",
  neutral:     "text-muted-foreground",
};

/**
 * A rounded number tile: label and a round icon chip on top, the figure, then a
 * one-line caption. Linked tiles lift on hover and show an arrow.
 */
export default function StatCard({
  label,
  value,
  color = "gold",
  sub,
  icon,
  trend,
  href,
  loading = false,
  compact = false,
  hero = false,
}: StatCardProps) {
  const accent = LEGACY_ALIAS[color] ?? color;
  const iconTone = ACCENT_ICON[accent] ?? ACCENT_ICON.gold;
  const attention = trend === "down";

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className={cn("min-w-0 truncate text-[0.8rem] sm:text-sm", hero ? "text-[#fff]" : "text-muted-foreground")}>
          {label}
        </p>
        {icon ? (
          <span
            aria-hidden
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full sm:size-7 [&_svg]:size-3 sm:[&_svg]:size-3.5",
              hero ? "bg-[rgb(255_255_255/0.2)] text-[#fff]" : cn("border border-border/80", iconTone)
            )}
          >
            {icon}
          </span>
        ) : href ? (
          <ArrowUpRight aria-hidden className={cn("size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100", hero ? "text-[#fff]" : "text-muted-foreground")} />
        ) : null}
      </div>
      {loading ? (
        <Skeleton className={cn("mt-3 h-7 w-20 sm:mt-4 sm:h-8 sm:w-24", hero && "bg-[rgb(255_255_255/0.25)]")} />
      ) : (
        <p
          className={cn(
            "font-display font-medium leading-none tracking-tight tabular-nums break-words",
            compact
              ? "mt-2 text-[clamp(1rem,11cqi,1.25rem)] sm:mt-2.5 sm:text-[clamp(1.05rem,11cqi,1.35rem)]"
              : "mt-2 text-[clamp(1.05rem,11cqi,1.3rem)] sm:mt-4 sm:text-[clamp(1.25rem,10cqi,1.75rem)]",
            hero ? "text-[#fff]" : "text-[var(--navy)] dark:text-[rgba(232,238,248,0.95)]"
          )}
        >
          {value}
        </p>
      )}
      {sub && !loading && (
        <p
          className={cn(
            // Phones keep tiles short: the label and figure carry them.
            "mt-3 hidden items-center gap-1.5 truncate text-xs sm:flex",
            hero ? "text-[rgb(255_255_255/0.9)]" : "text-muted-foreground"
          )}
        >
          {attention && !hero && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-warning" />}
          <span className="truncate">{sub}</span>
        </p>
      )}
    </>
  );

  const cls = cn(
    "group relative flex flex-col overflow-hidden rounded-[1.25rem] outline-none [container-type:inline-size] transition-[transform,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-ring",
    compact ? "min-h-[4.75rem] p-3 sm:min-h-[6.5rem]" : "min-h-[5.25rem] p-3 sm:min-h-[8.5rem] sm:p-4",
    hero
      ? "bg-gradient-to-br from-[hsl(var(--hero-from,var(--gold-hsl)))] to-[hsl(var(--hero-to,var(--gold-muted-hsl)))] shadow-[0_14px_30px_-14px_hsl(var(--hero-to,var(--gold-muted-hsl))/0.65)]"
      : "border border-border/70 bg-card shadow-[var(--shadow-xs)]",
    href && "no-underline sm:hover:-translate-y-0.5 sm:hover:shadow-[var(--shadow-md)]"
  );

  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
