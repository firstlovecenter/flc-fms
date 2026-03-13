import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Users, Clock, Calendar, User } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatDateTime } from "@/lib/utils";
import DeleteEventButton from "@/components/events/DeleteEventButton";

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  await requireStaff();

  const event = await prisma.event.findFirst({
    where: { id: params.id },
    include: {
      facility:  { select: { name: true, capacity: true } },
      createdBy: { select: { name: true } },
      bookings:  {
        include: { patron: { select: { name: true, email: true } } },
        take: 20,
      },
    },
  });

  if (!event) notFound();

  const durationMs = event.endTime.getTime() - event.startTime.getTime();
  const durationHrs = (durationMs / 3_600_000).toFixed(1);

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="flex items-start sm:items-center gap-3 flex-wrap">
        <Link href="/events" className="p-2 rounded-lg hover:bg-gray-100 text-[var(--muted)]">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{event.title}</h1>
            {event.isPublic
              ? <span className="badge badge-approved">Public</span>
              : <span className="badge badge-cancelled">Private</span>}
            {event.isRecurring && <span className="badge badge-pending">Recurring</span>}
          </div>
          {event.description && (
            <p className="page-subtitle mt-1">{event.description}</p>
          )}
        </div>
        <DeleteEventButton eventId={event.id} title={event.title} />
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Calendar, label: "Starts",   value: formatDateTime(event.startTime) },
          { icon: Clock,    label: "Duration", value: `${durationHrs} hrs` },
          { icon: MapPin,   label: "Venue",    value: event.facility.name },
          { icon: Users,    label: "Capacity", value: event.maxAttendees ? `Max ${event.maxAttendees.toLocaleString()}` : `${event.facility.capacity.toLocaleString()} (facility cap)` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center gap-2 text-[var(--muted)] mb-1">
              <Icon size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-sm font-semibold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Created by */}
      <div className="card p-4 flex items-center gap-3 flex-wrap">
        <div className="w-8 h-8 rounded-full bg-brand-100 text-[var(--navy)] flex items-center justify-center text-sm font-semibold">
          {event.createdBy.name.charAt(0)}
        </div>
        <div>
          <p className="text-xs text-[var(--muted)]">Created by</p>
          <p className="text-sm font-medium text-gray-800">{event.createdBy.name}</p>
        </div>
      </div>

      {/* Linked bookings */}
      {event.bookings.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-[var(--navy)] mb-4">Linked Bookings ({event.bookings.length})</h2>
          <div className="space-y-2">
            {event.bookings.map((b) => (
              <div key={b.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-b border-[var(--border)] last:border-0">
                <div>
                  <p className="text-sm font-medium">{b.patron?.name ?? "Staff booking"}</p>
                  <p className="text-xs text-[var(--muted)]">{b.patron?.email ?? ""}</p>
                </div>
                <Link href={`/bookings/${b.id}`} className="text-xs text-[var(--gold)] hover:underline">
                  View booking →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
