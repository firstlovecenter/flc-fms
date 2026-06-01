"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: "blue" | "green" | "red" | "yellow" | "gold" | "gray";
  sub?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  href?: string;
}

const accentColors: Record<string, string> = {
  blue:   "#3B82F6",
  green:  "#22C55E",
  red:    "#EF4444",
  yellow: "#EAB308",
  gold:   "var(--gold)",
  gray:   "#94A3B8",
};

export default function StatCard({ label, value, color = "gold", sub, icon, trend, href }: StatCardProps) {
  const accent = accentColors[color] ?? accentColors.gold;

  const content = (
    <>
      {/* Decorative glow (via CSS .stat-card::before, augmented per accent) */}
      <div className="stat-accent" />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
          {sub && <div className="stat-sub">{sub}</div>}
          {trend && trend !== "neutral" && (
            <div className={cn(
              "inline-flex items-center gap-1 mt-2 text-[0.72rem] font-semibold",
              trend === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
            )}>
              {trend === "up"
                ? <TrendingUp size={12} />
                : <TrendingDown size={12} />
              }
              <span>{trend === "up" ? "Trending up" : "Needs attention"}</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0 ml-3"
            style={{
              background: `color-mix(in srgb, ${accent} 12%, transparent)`,
              color: accent,
              border: `1px solid color-mix(in srgb, ${accent} 20%, transparent)`,
              boxShadow: `0 0 20px color-mix(in srgb, ${accent} 18%, transparent)`,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </>
  );

  const cardClass = cn("stat-card", href && "cursor-pointer");
  const dataAccent = color !== "gold" ? color : undefined;

  if (href) {
    return (
      <Link
        href={href}
        className={cardClass}
        data-accent={dataAccent}
        style={{ display: "block", textDecoration: "none" }}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={cardClass} data-accent={dataAccent}>
      {content}
    </div>
  );
}
