"use client";

import Link from "next/link";
import { Users, Clock, AlertTriangle, MapPin, ChevronUp, ChevronDown } from "lucide-react";
import ToggleMaintenanceButton from "@/components/facilities/ToggleMaintenanceButton";
import { updateFacilitySortOrder } from "@/actions/facility.actions";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

// Format currency locally
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

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
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full"
      style={{ animation: `fade-in 0.4s ease-out ${idx * 0.05}s backwards`, opacity: f.isActive ? 1 : 0.8 }}
    >
      <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
        {f.images && f.images.length > 0 ? (
          <img
            src={f.images[0]}
            alt={f.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <MapPin size={30} className="opacity-50 mb-2" />
            <span className="text-xs font-semibold uppercase tracking-widest">No Image</span>
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {f.underMaintenance && (
            <span className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-[10px] font-semibold text-orange-700">
              <AlertTriangle size={11} /> Maintenance
            </span>
          )}
          {!f.isActive && (
            <span className="inline-flex rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">
              Inactive
            </span>
          )}
        </div>
      </div>
    );

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="font-display font-bold text-xl text-[var(--navy)] leading-tight line-clamp-2">
            {f.name}
          </h3>
        </div>

        <p className="text-sm text-slate-600 line-clamp-2 mb-4 font-light">
          {f.description || "A versatile venue space managed by your campus team."}
        </p>

        <div className="mt-auto grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-slate-400" />
            <span>{f.capacity.toLocaleString()} cap</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-slate-400" />
            <span>{f.availableFrom} - {f.availableTo}</span>
          </div>
        </div>

        {f._count.bookings > 0 && (
          <p className="mt-3 text-xs text-[var(--gold)] font-semibold">
            {f._count.bookings} active booking{f._count.bookings !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="p-5 pt-0 border-t border-slate-100 mt-4 flex items-center gap-2">
        <Link
          href={`/facilities/${f.id}`}
          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 h-9 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex-1"
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
                title="Move up in listing order"
                className="p-0.5 rounded text-slate-400 hover:text-[var(--navy)] hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => moveOrder("down")}
                disabled={moving || idx === totalCount - 1}
                title="Move down in listing order"
                className="p-0.5 rounded text-slate-400 hover:text-[var(--navy)] hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
