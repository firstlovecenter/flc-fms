"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
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
  /** Domain accent — colors the icon chip and trend treatment */
  color?: Accent;
  sub?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  href?: string;
  loading?: boolean;
  /** Compact layout for mobile stat rows */
  compact?: boolean;
}

const LEGACY_ALIAS: Partial<Record<Accent, Accent>> = {
  blue: "bookings",
  green: "finance",
  red: "danger",
  yellow: "warning",
  gray: "neutral",
};

const ACCENT_CHIP: Record<string, string> = {
  gold:        "bg-gold/15 text-gold-muted ring-gold/25 dark:bg-gold/15 dark:text-gold",
  bookings:    "bg-bookings/10 text-bookings ring-bookings/20",
  facilities:  "bg-facilities/10 text-facilities ring-facilities/20",
  inventory:   "bg-inventory/10 text-inventory ring-inventory/20",
  maintenance: "bg-maintenance/10 text-maintenance ring-maintenance/20",
  finance:     "bg-finance/10 text-finance ring-finance/20",
  duty:        "bg-duty/10 text-duty ring-duty/20",
  success:     "bg-success/10 text-success ring-success/20",
  warning:     "bg-warning/10 text-warning ring-warning/20",
  danger:      "bg-danger/10 text-danger ring-danger/20",
  neutral:     "bg-foreground/5 text-muted-foreground ring-foreground/10",
};

const cardBase = cn(
  "relative overflow-hidden rounded-[var(--r-md)] bg-[var(--surface)] ring-1 ring-[var(--card-ring,var(--border))] [container-type:inline-size]",
  "shadow-[var(--shadow-sm)] transition-all duration-200",
  "dark:bg-[hsl(var(--ui-card))]",
  "sm:hover:shadow-[var(--shadow-md)] sm:hover:-translate-y-px"
);

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
}: StatCardProps) {
  const accent = LEGACY_ALIAS[color] ?? color;
  const chip = ACCENT_CHIP[accent] ?? ACCENT_CHIP.gold;

  const content = (
    <div
      className={cn(
        "relative z-10 flex items-start justify-between",
        compact ? "gap-1.5 p-2.5 sm:gap-2 sm:p-3" : "gap-2 p-2.5 sm:p-4 lg:p-5"
      )}
    >
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "truncate font-bold uppercase text-muted-foreground",
            compact ? "text-[0.55rem] tracking-[0.04em] sm:text-[0.65rem] sm:tracking-[0.08em]" : "text-[0.58rem] tracking-[0.04em] sm:text-[0.7rem] sm:tracking-[0.08em]"
          )}
        >
          {label}
        </div>
        {loading ? (
          <Skeleton className={cn("mb-1", compact ? "mt-1 h-5 w-12 sm:h-7 sm:w-16" : "mt-1 h-6 w-14 sm:mt-2 sm:h-8 sm:w-20 lg:h-9 lg:w-24")} />
        ) : (
          <div
            className={cn(
              "font-display font-bold tabular-nums break-words leading-tight text-[var(--navy)] dark:text-[rgba(232,238,248,0.95)]",
              // Scale the value to the card's own width (cqi) so long amounts
              // never overflow/clip; break-words is a last-resort safety net.
              compact ? "mt-0.5 text-[clamp(0.95rem,12cqi,1.2rem)] sm:mt-1 sm:text-[clamp(1rem,9cqi,1.3rem)]" : "mt-0.5 text-[clamp(1rem,12cqi,1.35rem)] sm:mt-1.5 sm:text-[clamp(1.15rem,9cqi,1.85rem)] lg:text-[clamp(1.2rem,10cqi,2.1rem)]"
            )}
          >
            {value}
          </div>
        )}
        {sub && !loading && (
          <div className="mt-1 hidden truncate text-[0.72rem] leading-snug text-muted-foreground sm:block lg:text-body-sm">{sub}</div>
        )}
        {trend && trend !== "neutral" && !loading && (
          <span
            className={cn(
              "mt-2 hidden items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold leading-none sm:inline-flex",
              trend === "up"
                ? "bg-success/15 text-success"
                : "bg-danger/15 text-danger"
            )}
          >
            {trend === "up" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            <span>{trend === "up" ? "Trending up" : "Needs attention"}</span>
          </span>
        )}
      </div>
      {icon && (
        <div
          aria-hidden
          className={cn(
            "ml-1.5 flex shrink-0 items-center justify-center rounded-[8px] ring-1 ring-inset [&_svg]:size-3.5 sm:ml-2 sm:rounded-[10px] sm:[&_svg]:size-4",
            compact ? "h-7 w-7 sm:h-9 sm:w-9" : "h-7 w-7 sm:h-9 sm:w-9 lg:h-10 lg:w-10",
            chip
          )}
        >
          {icon}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={cn(cardBase, "block no-underline")}>
        {content}
      </Link>
    );
  }

  return <div className={cardBase}>{content}</div>;
}
