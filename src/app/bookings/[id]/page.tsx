import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Building2, User, FileText, Phone, MessageCircle, LogIn } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDateTime, statusBadgeClass, durationHours } from "@/lib/utils";
import BookingActions from "@/components/bookings/BookingActions";
import CancelBookingButton from "@/components/bookings/CancelBookingButton";
import CompleteBookingButton from "@/components/bookings/CompleteBookingButton";
import SendSMSButton from "@/components/bookings/SendSMSButton";

function normalizeTel(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function normalizeWhatsApp(phone: string) {
  return phone.replace(/\D/g, "");
}

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  const session  = await requireStaff();

  const booking = await prisma.booking.findFirst({
    where: { id: params.id },
    include: {
      facility: true,
      patron:   true,
      user:     { select: { name: true, email: true, role: true, phone: true } },
      checkIn:  {
        include: {
          checkedInBy:  { select: { name: true } },
          checkedOutBy: { select: { name: true } },
        },
      },
    },
  });

  if (!booking) notFound();

  const canManage = ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"].includes(session.role);
  const contact   = booking.patron ?? booking.user;

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="flex items-start sm:items-center gap-3 flex-wrap">
        <Link href="/bookings" className="p-2 rounded-lg hover:bg-gray-100 text-[var(--muted)]">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{booking.title}</h1>
          {booking.description && <p className="page-subtitle mt-0.5">{booking.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={statusBadgeClass(booking.status)}>{booking.status}</span>
        </div>
      </div>

      {booking.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          <strong>Rejection reason:</strong> {booking.rejectionReason}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Facility */}
        <div className="card p-5">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-3">
            <Building2 size={13} /> Facility
          </div>
          <p className="font-semibold text-[var(--navy)]">{booking.facility?.name ?? "N/A"}</p>
          <p className="text-sm page-subtitle">Cap. {booking.facility?.capacity.toLocaleString() ?? "N/A"}</p>
          {booking.facilityId && (
            <Link href={`/facilities/${booking.facilityId}`} className="text-xs text-[var(--gold)] hover:underline mt-2 block">
              View facility →
            </Link>
          )}
        </div>

        {/* Time */}
        <div className="card p-5">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-3">
            <Clock size={13} /> Schedule
          </div>
          <p className="text-sm text-gray-800"><strong>From:</strong> {formatDateTime(booking.startTime)}</p>
          <p className="text-sm text-gray-800 mt-1"><strong>To:</strong> {formatDateTime(booking.endTime)}</p>
          <p className="text-xs text-[var(--muted)] mt-2">{durationHours(booking.startTime, booking.endTime)} hours</p>
        </div>

        {/* Booker */}
        <div className="card p-5">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-3">
            <User size={13} /> {booking.patron ? "Patron" : "Staff"}
          </div>
          <p className="font-semibold text-[var(--navy)]">{contact?.name}</p>
          <p className="text-sm page-subtitle">{contact?.email}</p>
          {contact?.phone && (
            <>
              <p className="text-xs text-[var(--muted)] mt-1">{contact.phone}</p>
              <div className="flex items-center gap-3 mt-2">
                <a
                  href={`tel:${normalizeTel(contact.phone)}`}
                  className="inline-flex items-center gap-1 text-xs text-[var(--navy)] hover:underline"
                >
                  <Phone size={12} /> Call
                </a>
                <a
                  href={`https://wa.me/${normalizeWhatsApp(contact.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-green-700 hover:underline"
                >
                  <MessageCircle size={12} /> WhatsApp
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="card p-6">
        <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-4">
          <FileText size={13} /> Booking Amount
        </div>
        <p className="text-3xl font-bold text-[var(--navy)]">{formatCurrency(Number(booking.totalAmount))}</p>
      </div>

      {booking.notes && (
        <div className="card p-5">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-2">
            <FileText size={13} /> Notes
          </div>
          <p className="text-sm text-[var(--slate)]">{booking.notes}</p>
        </div>
      )}

      {/* Check-In / Check-Out Status */}
      {(booking.checkIn || booking.checkInRequested) && (
        <div className={`card p-5 ${booking.checkIn ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-2 text-[var(--muted)]">
            <LogIn size={13} /> Check-In Status
          </div>
          {booking.checkIn ? (
            <div className="text-sm space-y-1">
              <p className="text-green-800">
                <strong>Checked in</strong> by {booking.checkIn.checkedInBy.name} at {formatDateTime(booking.checkIn.checkedInAt)}
              </p>
              {booking.checkIn.checkedOutAt && booking.checkIn.checkedOutBy && (
                <p className="text-gray-700">
                  <strong>Checked out</strong> by {booking.checkIn.checkedOutBy.name} at {formatDateTime(booking.checkIn.checkedOutAt)}
                </p>
              )}
              {booking.checkIn.notes && (
                <p className="text-xs text-gray-600 mt-1 whitespace-pre-line"><strong>Notes:</strong> {booking.checkIn.notes}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-amber-800">Patron has requested check-in. <a href="/checkin" className="underline font-semibold">Go to Check-In page →</a></p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {canManage && booking.status === "PENDING" && (
          <BookingActions bookingId={booking.id} />
        )}
        {canManage && booking.status === "APPROVED" && (
          <CompleteBookingButton bookingId={booking.id} />
        )}
        {["PENDING", "APPROVED"].includes(booking.status) && (
          <CancelBookingButton bookingId={booking.id} />
        )}
        {canManage && contact?.phone && (
          <SendSMSButton
            bookingId={booking.id}
            bookingTitle={booking.title}
            bookerName={contact.name}
            bookerPhone={contact.phone}
          />
        )}
      </div>
    </div>
  );
}
