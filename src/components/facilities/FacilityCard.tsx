"use client";

import Link from "next/link";
import { Users, AlertTriangle, MapPin, ChevronUp, ChevronDown } from "lucide-react";
import ToggleMaintenanceButton from "@/components/facilities/ToggleMaintenanceButton";
import { updateFacilitySortOrder } from "@/actions/facility.actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

interface FacilityCardProps {
  facility: {
    id: string;
    name: string;
    description: string | null;
    capacity: number;
    pricePerHour: number;
    images: string[];
    isActive: boolean;
    underMaintenance: boolean;
    maintenanceStartsAt?: Date | string | null;
    maintenanceEndsAt?: Date | string | null;
    sortOrder: number;
    availableFrom: string;
    availableTo: string;
    _count: { bookings: number };
  };
  canManage: boolean;
  index: number;
  totalCount: number;
}

export default function FacilityCard({ facility: f, canManage, index: idx, totalCount }: FacilityCardProps) {
  const router = useRouter();
  const [moving, setMoving] = useState(false);

  async function moveOrder(direction: "up" | "down") {
    setMoving(true);
    const newOrder = direction === "up" ? f.sortOrder - 1 : f.sortOrder + 1;
    await updateFacilitySortOrder(f.id, newOrder);
    router.refresh();
    setMoving(false);
  }

  return (
    <div
      className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-white dark:bg-[rgba(15,26,43,0.7)] shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col h-full"
      style={{
        animation: `fadeIn 0.4s ease-out ${idx * 0.05}s backwards`,
        opacity: f.isActive ? 1 : 0.75,
      }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {f.images && f.images.length > 0 ? (
          <img
            src={f.images[0]}
            alt={f.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <MapPin size={30} className="opacity-40 mb-2" />
            <span className="text-xs font-semibold uppercase tracking-widest opacity-60">No Image</span>
          </div>
        )}

        {/* Status overlays */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {f.underMaintenance && (
            <span className="inline-flex items-center gap-1 rounded-md border border-maintenance/25 bg-maintenance/10 backdrop-blur-sm px-2 py-1 text-[10px] font-semibold text-maintenance">
              <AlertTriangle size={10} /> Maintenance
            </span>
          )}
          {!f.isActive && (
            <span className="inline-flex rounded-md border border-danger/25 bg-danger/10 backdrop-blur-sm px-2 py-1 text-[10px] font-semibold text-danger">
              Inactive
            </span>
          )}
        </div>

        {/* Booking count pill */}
        {f._count.bookings > 0 && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center rounded-full bg-[var(--navy)]/80 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold text-[var(--gold)]">
              {f._count.bookings} booking{f._count.bookings !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-5 flex-1 flex flex-col gap-3">
        <div>
          <h3 className="font-bold text-lg text-[var(--navy)] leading-tight line-clamp-1" style={{ fontFamily: "var(--font-display)" }}>
            {f.name}
          </h3>
          <p className="text-sm text-[var(--slate)] line-clamp-2 mt-1 font-light leading-relaxed">
            {f.description || "A versatile venue space managed by your campus team."}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-[var(--muted)] mt-auto">
          <div className="flex items-center gap-1.5">
            <Users size={13} className="text-[var(--muted)]" />
            <span>{f.capacity.toLocaleString()} capacity</span>
          </div>
        </div>
      </div>

      {/* Card footer */}
      <div className="px-5 pb-5 pt-0 border-t border-[var(--border)] mt-auto flex items-center gap-2 pt-4">
        <Link
          href={`/facilities/${f.id}`}
          className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
        >
          Manage
        </Link>
        {canManage && (
          <>
            <ToggleMaintenanceButton
              facilityId={f.id}
              underMaintenance={f.underMaintenance}
              maintenanceStartsAt={f.maintenanceStartsAt}
              maintenanceEndsAt={f.maintenanceEndsAt}
            />
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => moveOrder("up")}
                disabled={moving || idx === 0}
                title="Move up"
                aria-label="Move up"
                className="p-1 rounded text-[var(--muted)] hover:text-[var(--navy)] hover:bg-[var(--cream-dark)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronUp size={13} />
              </button>
              <button
                onClick={() => moveOrder("down")}
                disabled={moving || idx === totalCount - 1}
                title="Move down"
                aria-label="Move down"
                className="p-1 rounded text-[var(--muted)] hover:text-[var(--navy)] hover:bg-[var(--cream-dark)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronDown size={13} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
