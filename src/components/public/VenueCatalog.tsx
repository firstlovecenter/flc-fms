"use client";

import { useState } from "react";
import { CalendarDays, Heart, Baby, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import FacilityCatalogClient from "@/components/public/FacilityCatalogClient";
import CeremonyCatalogClient from "@/components/public/CeremonyCatalogClient";

type VType = "regular" | "naming" | "wedding";

type Props = {
  facilities: React.ComponentProps<typeof FacilityCatalogClient>["facilities"];
  weddingConfigs: React.ComponentProps<typeof CeremonyCatalogClient>["configs"];
  namingConfigs: React.ComponentProps<typeof CeremonyCatalogClient>["configs"];
  defaultType?: VType;
};

export default function VenueCatalog({
  facilities,
  weddingConfigs,
  namingConfigs,
  defaultType = "regular",
}: Props) {
  const [vtype, setVtype] = useState<VType>(defaultType);

  const chips: { key: VType; label: string; icon: React.ElementType; count: number }[] = [
    { key: "regular", label: "Regular", icon: CalendarDays, count: facilities.length },
    { key: "wedding", label: "Weddings", icon: Heart, count: weddingConfigs.length },
    { key: "naming", label: "Namings", icon: Baby, count: namingConfigs.length },
  ];

  return (
    <div>
      {/* Booking-type filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {chips.map(({ key, label, icon: Icon, count }) => {
          const active = vtype === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setVtype(key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white dark:bg-[rgba(15,26,43,0.4)] text-[var(--slate)] dark:text-gray-300 border-[var(--border)] hover:border-[var(--gold)]/40",
              )}
            >
              <Icon size={15} />
              {label}
              <span
                className={cn(
                  "ml-0.5 text-xs px-1.5 rounded-full tabular-nums",
                  active ? "bg-white/15" : "bg-[rgba(10,22,40,0.06)] dark:bg-[rgba(255,255,255,0.08)]",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {vtype === "regular" &&
        (facilities.length === 0 ? (
          <EmptyVenues />
        ) : (
          <FacilityCatalogClient facilities={facilities} />
        ))}
      {vtype === "wedding" && <CeremonyCatalogClient type="WEDDING" configs={weddingConfigs} />}
      {vtype === "naming" && <CeremonyCatalogClient type="NAMING" configs={namingConfigs} />}
    </div>
  );
}

function EmptyVenues() {
  return (
    <div className="empty-state card border-dashed py-20">
      <div className="w-20 h-20 rounded-full bg-[var(--gold)]/10 flex items-center justify-center mb-6">
        <MapPin size={32} className="text-[var(--gold)]" />
      </div>
      <h3>No venues available yet</h3>
      <p>Check back soon — our team is adding more options.</p>
    </div>
  );
}
