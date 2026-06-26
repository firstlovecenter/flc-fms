"use client";

import Link from "next/link";
import { Building2, Package, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "venues" | "items" | "packages";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "venues",   label: "Venues",   icon: Building2 },
  { id: "items",    label: "Items",    icon: Package },
  { id: "packages", label: "Packages", icon: Layers },
];

export default function CatalogTabs({
  active,
  counts,
}: {
  active: Tab;
  counts: { venues: number; items: number; packages: number };
}) {
  return (
    <div className="flex gap-1 mb-8 p-1 rounded-xl overflow-x-auto bg-[rgba(22,26,31,0.04)] dark:bg-[rgba(255,255,255,0.04)] border border-[var(--border)] scrollbar-thin">
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <Link
            key={id}
            href={id === "venues" ? "/" : `/?tab=${id}`}
            className={cn(
              "min-w-[96px] sm:min-w-0 flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200",
              isActive
                ? "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(255,66,102,0.22)]"
                : "text-[var(--text-muted)] hover:text-[var(--navy)] dark:hover:text-[#fff] hover:bg-[rgba(22,26,31,0.04)] dark:hover:bg-[rgba(255,255,255,0.06)]"
            )}
          >
            <Icon size={15} className="shrink-0" />
            {label}
            <span
              className={cn(
                "ml-1 text-xs px-1.5 py-0.5 rounded-full font-bold tabular-nums",
                isActive
                  ? "bg-white/18 text-white"
                  : "bg-[rgba(22,26,31,0.07)] dark:bg-[rgba(255,255,255,0.08)] text-[var(--text-muted)]"
              )}
            >
              {counts[id]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
