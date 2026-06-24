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
  "relative overflow-hidden rounded-[var(--r-lg)] bg-[var(--surface)] ring-1 ring-[var(--border)] [container-type:inline-size]",
  "shadow-[var(--shadow-sm)] transition-all duration-200",
  "dark:bg-[hsl(var(--ui-card))] dark:ring-[hsl(var(--ui-border))]",
  "hover:shadow-[var(--shadow-md)] hover:-translate-y-px"
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
        compact ? "p-3 gap-2" : "p-5"
      )}
    >
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "font-bold uppercase tracking-widest text-muted-foreground",
            compact ? "text-[0.65rem]" : "text-[0.72rem]"
          )}
        >
          {label}
        </div>
        {loading ? (
          <Skeleton className={cn("mt-2 mb-1.5", compact ? "h-7 w-16" : "h-9 w-24")} />
        ) : (
          <div
            className={cn(
              "font-display font-bold tabular-nums break-words leading-tight text-[var(--navy)] dark:text-[rgba(232,238,248,0.95)]",
              // Scale the value to the card's own width (cqi) so long amounts
              // never overflow/clip; break-words is a last-resort safety net.
              compact ? "text-[clamp(0.9rem,9cqi,1.3rem)] mt-1" : "text-[clamp(1rem,10cqi,2.1rem)] mt-2"
            )}
          >
            {value}
          </div>
        )}
        {sub && !loading && (
          <div className="mt-1 text-body-sm text-muted-foreground">{sub}</div>
        )}
        {trend && trend !== "neutral" && !loading && (
          <span
            className={cn(
              "inline-flex items-center gap-1 mt-2 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold leading-none",
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
            "flex shrink-0 items-center justify-center rounded-[12px] ring-1 ring-inset ml-3",
            compact ? "h-9 w-9" : "h-11 w-11",
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
