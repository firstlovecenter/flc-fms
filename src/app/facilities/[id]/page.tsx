import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, Clock, Calendar, Wrench, TimerIcon, Church } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { hasVicarPermission } from "@/lib/staff-permissions";
import { formatCurrency, formatDateTime, statusBadgeClass } from "@/lib/utils";
import ToggleMaintenanceButton from "@/components/facilities/ToggleMaintenanceButton";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function FacilityDetailPage({ params }: { params: { id: string } }) {
  const session  = await requireStaff();

  const facility = await prisma.facility.findFirst({
    where: { id: params.id },
    include: {
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
    },
  });

  if (!facility) notFound();

  const canManage = ["FACILITY_MANAGER", "SUPER_ADMIN"].includes(session.role);
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
              <Link href={`/facilities/${facility.id}/slots`} className="btn-secondary flex items-center gap-1.5">
                <TimerIcon size={14} /> Time Slots
              </Link>
              <Link href={`/facilities/${facility.id}/ceremonies`} className="btn-secondary flex items-center gap-1.5">
                <Church size={14} /> Ceremony Days
              </Link>
              <Link href={`/facilities/${facility.id}/edit`} className="btn-secondary">Edit</Link>
              <ToggleMaintenanceButton
                facilityId={facility.id}
                underMaintenance={facility.underMaintenance}
                maintenanceStartsAt={facility.maintenanceStartsAt}
                maintenanceEndsAt={facility.maintenanceEndsAt}
              />
            </>
          )}
          {canCreateBookings && (
            <Link href={`/bookings/new?facilityId=${facility.id}`} className="btn-primary">Book Now</Link>
          )}
        </div>
      </div>

      {/* Status banners */}
      {facility.underMaintenance && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3 text-orange-800">
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
        {/* Pricing */}
        <div className="card p-5">
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Pricing</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--slate)]">Per Hour</span>
              <span className="font-semibold">{formatCurrency(Number(facility.pricePerHour))}</span>
            </div>
            {facility.pricePerDay && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--slate)]">Per Day</span>
                <span className="font-semibold">{formatCurrency(Number(facility.pricePerDay))}</span>
              </div>
            )}
          </div>
        </div>

        {/* Capacity & Hours */}
        <div className="card p-5">
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
          </div>
        </div>

        {/* Amenities */}
        <div className="card p-5">
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Amenities</h3>
          {facility.amenities.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">None listed</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {facility.amenities.map((a) => (
                <span key={a} className="text-xs bg-brand-50 text-[var(--navy)] border border-brand-200 px-2 py-0.5 rounded-full">{a}</span>
              ))}
            </div>
          )}
        </div>
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
          <div className="card p-5">
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
          </div>
        );
      })()}

      {/* Upcoming bookings */}      <div className="card p-6">
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
                  <span className={statusBadgeClass(b.status)}>{b.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open maintenance */}
      {facility.maintenance.length > 0 && (
        <div className="card p-6 border-orange-200">
          <h2 className="font-semibold text-orange-800 mb-4">Open Maintenance ({facility.maintenance.length})</h2>
          <div className="space-y-2">
            {facility.maintenance.map((m) => (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-b border-orange-100 last:border-0">
                <div>
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-[var(--muted)]">By {m.requestedBy.name}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={statusBadgeClass(m.priority)}>{m.priority}</span>
                  <span className={statusBadgeClass(m.status)}>{m.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
