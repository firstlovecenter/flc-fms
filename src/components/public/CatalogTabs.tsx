"use client";

import Link from "next/link";
import { Building2, Package, Layers } from "lucide-react";

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
    <div
      className="flex gap-1 mb-8 p-1 rounded-2xl overflow-x-auto"
      style={{ background: "rgba(10,22,40,0.06)", border: "1px solid var(--border)" }}
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <Link
            key={id}
            href={id === "venues" ? "/" : `/?tab=${id}`}
            className="min-w-[96px] sm:min-w-0 flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all"
            style={{
              background: isActive ? "var(--navy-glass)" : "transparent",
              color: isActive ? "#fff" : "var(--slate)",
              boxShadow: isActive ? "0 2px 8px rgba(10,22,40,0.18)" : "none",
            }}
          >
            <Icon size={15} />
            {label}
            <span
              className="ml-1 text-xs px-1.5 py-0.5 rounded-full font-bold"
              style={{
                background: isActive ? "rgba(200,163,90,0.25)" : "rgba(10,22,40,0.08)",
                color: isActive ? "var(--gold-pale)" : "var(--muted)",
              }}
            >
              {counts[id]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
