import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, Clock, Calendar, Wrench, TimerIcon } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { hasVicarPermission } from "@/lib/staff-permissions";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { buttonVariants } from "@/components/ui/button-variants";
import ToggleMaintenanceButton from "@/components/facilities/ToggleMaintenanceButton";
import CeremonyConfigCard from "@/components/facilities/CeremonyConfigCard";

import { Card } from "@/components/ui/card";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function FacilityDetailPage({ params }: { params: { id: string } }) {
  const session  = await requireStaff();

  const facility = await prisma.facility.findFirst({
    where: { id: params.id },
    include: {
      ceremonyConfigs: true,
      bookings: {
        where: { status: { in: ["PENDING", "APPROVED"] } },
        include: {
          patron: { select: { name: true } },
          user:   { select: { name: true } },
        },
        orderBy: { startTime: "asc" },
        take: 10,
      },
      maintenance: {
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        include: { requestedBy: { select: { name: true } } },
        take: 5,
      },
      timeSlots: {
        where: { isActive: true },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      pricing: {
        where: { isActive: true },
        orderBy: { category: "asc" },
      },
    },
  });

  if (!facility) notFound();

  const canManage = ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"].includes(session.role);
  const canCreateBookings = canManage || (session.role === "VICAR" && hasVicarPermission(session.permissions, "canCreateBookings"));
  return (
    <div className="space-y-6 w-full max-w-4xl">
      <div className="flex items-start sm:items-center gap-4 flex-wrap">
        <Link href="/facilities" className="p-2 rounded-lg hover:bg-gray-100 text-[var(--muted)]">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{facility.name}</h1>
          {facility.description && (
            <p className="page-subtitle mt-0.5">{facility.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <>
              <Link href={`/facilities/${facility.id}/slots`} className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
                <TimerIcon size={14} /> Time Slots
              </Link>
              <Link href={`/facilities/${facility.id}/edit`} className={cn(buttonVariants({ variant: "outline" }))}>Edit</Link>
              <ToggleMaintenanceButton
                facilityId={facility.id}
                underMaintenance={facility.underMaintenance}
                maintenanceStartsAt={facility.maintenanceStartsAt}
                maintenanceEndsAt={facility.maintenanceEndsAt}
              />
            </>
          )}
          {canCreateBookings && (
            <Link href={`/bookings/new?facilityId=${facility.id}`} className={cn(buttonVariants({ variant: "default" }))}>Book Now</Link>
          )}
        </div>
      </div>

      {/* Status banners */}
      {facility.underMaintenance && (
        <div className="bg-maintenance/10 border border-maintenance/25 rounded-lg p-4 flex items-center gap-3 text-maintenance">
          <Wrench size={18} className="shrink-0" />
          <div>
            <p className="font-medium">This facility is currently under maintenance and cannot be booked.</p>
            {facility.maintenanceStartsAt && (
              <p className="text-sm mt-0.5">
                Period: <strong>{new Date(facility.maintenanceStartsAt).toLocaleDateString()}</strong>
                {facility.maintenanceEndsAt
                  ? <> – <strong>{new Date(facility.maintenanceEndsAt).toLocaleDateString()}</strong></>
                  : " – indefinite"}
              </p>
            )}
          </div>
        </div>
      )}
      {!facility.isActive && (
        <div className="bg-[var(--cream)] border border-[var(--border)] rounded-lg p-4 text-[var(--slate)]">
          This facility is inactive.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Category pricing */}
        <Card className="p-5">
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Category Pricing</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--slate)]">Active categories</span>
              <span className="font-semibold">{facility.pricing.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--slate)]">Active slots</span>
              <span className="font-semibold">{facility.timeSlots.length}</span>
            </div>
            {facility.pricing.length === 0 ? (
              <p className="text-xs text-[var(--muted)] pt-1">No category mapping yet.</p>
            ) : (
              <p className="text-xs text-[var(--muted)] pt-1">{facility.pricing.slice(0, 2).map((p) => p.category.replace(/_/g, " ")).join(", ")}{facility.pricing.length > 2 ? "..." : ""}</p>
            )}
          </div>
        </Card>

        {/* Capacity & Hours */}
        <Card className="p-5">
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-[var(--slate)]">
              <Users size={14} /> Capacity: <span className="font-semibold text-[var(--navy)]">{facility.capacity.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--slate)]">
              <Clock size={14} /> Hours: <span className="font-semibold text-[var(--navy)]">{facility.availableFrom}–{facility.availableTo}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--slate)]">
              <Calendar size={14} />
              <span>{facility.availableDays.map((d) => DAYS[d]).join(", ")}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--slate)]">
              <span>AC add-on:</span>
              <span className="font-semibold text-[var(--navy)]">{formatCurrency(Number(facility.acUsageFee ?? 0))}</span>
            </div>
          </div>
        </Card>

        {/* Amenities */}
        <Card className="p-5">
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Amenities</h3>
          {facility.amenities.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">None listed</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {facility.amenities.map((a) => (
                <span key={a} className="text-xs bg-gold-pale text-[var(--navy)] border border-gold px-2 py-0.5 rounded-full">{a}</span>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Time Slots summary */}
      {(() => {
        const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const slotsByDay = DAYS.map((d, i) => ({
          label: d,
          slots: facility.timeSlots.filter((s) => s.dayOfWeek === i),
        }));
        const activeDays = slotsByDay.filter((d) => d.slots.length > 0);
        return (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
                Available Time Slots ({facility.timeSlots.length})
              </h3>
              {canManage && (
                <Link href={`/facilities/${facility.id}/slots`} className="text-xs text-[var(--navy)] hover:underline font-medium">
                  Manage →
                </Link>
              )}
            </div>
            {activeDays.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No time slots configured yet.{" "}
                {canManage && (
                  <Link href={`/facilities/${facility.id}/slots`} className="text-[var(--navy)] underline">
                    Add slots →
                  </Link>
                )}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {activeDays.map(({ label, slots }) => (
                  <div key={label} className="bg-[var(--cream)] rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-[var(--navy)] mb-1">{label}</p>
                    {slots.map((s) => (
                      <p key={s.id} className="text-xs text-[var(--slate)]">
                        {s.startTime}–{s.endTime}
                        {s.isFlexible ? <span className="text-[var(--muted)] ml-1">(flex)</span> : null}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })()}

      {/* Upcoming bookings */}      <Card className="p-6">
        <h2 className="font-semibold text-[var(--navy)] mb-4">Upcoming Bookings ({facility.bookings.length})</h2>
        {facility.bookings.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No upcoming bookings.</p>
        ) : (
          <div className="space-y-2">
            {facility.bookings.map((b) => (
              <div key={b.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-b border-[var(--border)] last:border-0">
                <div>
                  <p className="text-sm font-medium text-[var(--navy)]">{b.title}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {formatDateTime(b.startTime)} → {formatDateTime(b.endTime)}
                  </p>
                  <p className="text-xs text-[var(--muted)]">By: {(b.patron ?? b.user)?.name ?? "Unknown"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold">{formatCurrency(Number(b.totalAmount))}</span>
                  <StatusBadge status={b.status} size="xs" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Open maintenance */}
      {facility.maintenance.length > 0 && (
        <Card className="p-6 border-maintenance/25">
          <h2 className="font-semibold text-maintenance mb-4">Open Maintenance ({facility.maintenance.length})</h2>
          <div className="space-y-2">
            {facility.maintenance.map((m) => (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-b border-maintenance/15 last:border-0">
                <div>
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-[var(--muted)]">By {m.requestedBy.name}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={m.priority} size="xs" />
                  <StatusBadge status={m.status} size="xs" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ceremony Configurations */}
      {canManage && (
        <div className="space-y-3">
          <h2 className="font-semibold text-[var(--navy)]">Ceremony Configurations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CeremonyConfigCard
              facilityId={facility.id}
              type="WEDDING"
              config={facility.ceremonyConfigs.find((c) => c.type === "WEDDING") ?? null}
            />
            <CeremonyConfigCard
              facilityId={facility.id}
              type="NAMING"
              config={facility.ceremonyConfigs.find((c) => c.type === "NAMING") ?? null}
            />
          </div>
        </div>
      )}

    </div>
  );
}
