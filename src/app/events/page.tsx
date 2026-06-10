import Link from "next/link";
import { Plus, Calendar, Users, MapPin } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { cn, formatDateTime, formatDate } from "@/lib/utils";
import DeleteEventButton from "@/components/events/DeleteEventButton";
import PageHeader from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { view?: "upcoming" | "past" | "all" };
}) {
  await requireStaff();
  const session  = await getSession();
  const view     = searchParams.view ?? "upcoming";

  const now = new Date();
  const whereTime =
    view === "upcoming" ? { startTime: { gte: now } }
    : view === "past"   ? { startTime: { lt:  now } }
    : {};

  const events = await prisma.event.findMany({
    where: { ...whereTime },
    include: {
      facility:  { select: { name: true } },
      createdBy: { select: { name: true } },
      _count:    { select: { bookings: true } },
    },
    orderBy: { startTime: view === "past" ? "desc" : "asc" },
  });

  // Group by date for the calendar-like display
  const grouped: Record<string, typeof events> = {};
  for (const e of events) {
    const key = formatDate(e.startTime);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  }

  const canManage = session && ["FACILITY_MANAGER", "SUPER_ADMIN"].includes(session.role);
  const canCreate = session && (canManage || session.permissions?.canCreateEvents);

  return (
    <div className="space-y-6">
      <PageHeader
        variant="hero"
        eyebrow="Facility Management"
        title="Events"
        description={`${events.length} event${events.length !== 1 ? "s" : ""} scheduled`}
        className="relative z-10"
        actions={
          canCreate ? (
            <Link href="/events/new" className={cn(buttonVariants({ variant: "default" }), "gap-2 flex-shrink-0")}>
              <Plus size={16} /> New Event
            </Link>
          ) : undefined
        }
      />

      {/* View tabs */}
      <div className="flex gap-2">
        {(["upcoming", "past", "all"] as const).map((v) => (
          <Link
            key={v}
            href={`/events?view=${v}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors capitalize ${
              view === v
                ? "bg-[var(--navy)] text-white border-gold"
                : "bg-white text-[var(--slate)] border-[var(--border)] hover:bg-[var(--cream)]"
            }`}
          >
            {v}
          </Link>
        ))}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card className="p-16 text-center gap-0">
          <Calendar size={40} className="text-gray-300 mx-auto mb-4" />
          <p className="text-[var(--muted)] text-lg">No {view} events</p>
          {canCreate && (
            <Link href="/events/new" className={cn(buttonVariants({ variant: "default" }), "mt-4")}>Create your first event</Link>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayEvents]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px bg-gray-200 flex-1" />
                <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">{date}</span>
                <div className="h-px bg-gray-200 flex-1" />
              </div>
              <div className="space-y-3">
                {dayEvents.map((e) => (
                  <Card key={e.id} className="p-5 hover:shadow-md transition-shadow gap-0 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        {/* Time column */}
                        <div className="text-center min-w-[3.5rem] pt-0.5">
                          <p className="text-sm font-bold text-[var(--navy)]">
                            {new Date(e.startTime).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            {new Date(e.endTime).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        {/* Divider */}
                        <div className="w-px bg-gold self-stretch" />
                        {/* Content */}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-[var(--navy)]">{e.title}</h3>
                            {e.isPublic
                              ? <StatusBadge status="APPROVED" label="Public" size="xs" />
                              : <StatusBadge status="CANCELLED" label="Private" size="xs" />}
                            {e.isRecurring && <StatusBadge status="PENDING" label="Recurring" size="xs" />}
                          </div>
                          {e.description && (
                            <p className="text-sm text-[var(--muted)] mt-1 line-clamp-2">{e.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--muted)]">
                            <span className="flex items-center gap-1">
                              <MapPin size={11} /> {e.facility.name}
                            </span>
                            {e.maxAttendees && (
                              <span className="flex items-center gap-1">
                                <Users size={11} /> Max {e.maxAttendees.toLocaleString()}
                              </span>
                            )}
                            <span>By {e.createdBy.name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/events/${e.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>View</Link>
                        {canManage && <DeleteEventButton eventId={e.id} title={e.title} />}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
