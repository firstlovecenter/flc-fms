import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Building2, User, CreditCard, FileText } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDateTime, statusBadgeClass, durationHours } from "@/lib/utils";
import BookingActions from "@/components/bookings/BookingActions";
import CancelBookingButton from "@/components/bookings/CancelBookingButton";
import CompleteBookingButton from "@/components/bookings/CompleteBookingButton";

export default async function BookingDetailPage({ params }: { params: { id: string } }) {
  const session  = await requireStaff();

  const booking = await prisma.booking.findFirst({
    where: { id: params.id },
    include: {
      facility: true,
      patron:   true,
      user:     { select: { name: true, email: true, role: true } },
      payment:  true,
      receipt:  true,
    },
  });

  if (!booking) notFound();

  const canManage = ["FACILITY_MANAGER", "SUPER_ADMIN"].includes(session.role);
  const contact   = booking.patron ?? booking.user;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/bookings" className="p-2 rounded-lg hover:bg-gray-100 text-[var(--muted)]">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{booking.title}</h1>
          {booking.description && <p className="page-subtitle mt-0.5">{booking.description}</p>}
        </div>
        <div className="flex gap-2">
          <span className={statusBadgeClass(booking.status)}>{booking.status}</span>
          <span className={statusBadgeClass(booking.paymentStatus)}>{booking.paymentStatus}</span>
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
          {booking.patron?.phone && <p className="text-xs text-[var(--muted)] mt-1">{booking.patron.phone}</p>}
        </div>
      </div>

      {/* Payment summary */}
      <div className="card p-6">
        <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-4">
          <CreditCard size={13} /> Payment
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-[var(--navy)]">{formatCurrency(Number(booking.totalAmount))}</p>
            {booking.payment && (
              <p className="text-sm text-[var(--muted)] mt-1">
                Via {booking.payment.provider}
                {booking.payment.paidAt && ` · Paid ${formatDateTime(booking.payment.paidAt)}`}
              </p>
            )}
          </div>
          {booking.receipt && (
            <div className="text-right">
              <p className="text-xs text-[var(--muted)]">Receipt</p>
              <p className="font-mono font-semibold text-[var(--slate)]">#{booking.receipt.receiptNumber}</p>
            </div>
          )}
        </div>
      </div>

      {booking.notes && (
        <div className="card p-5">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-2">
            <FileText size={13} /> Notes
          </div>
          <p className="text-sm text-[var(--slate)]">{booking.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {canManage && booking.status === "PENDING" && (
          <BookingActions bookingId={booking.id} />
        )}
        {canManage && booking.status === "APPROVED" && (
          <CompleteBookingButton bookingId={booking.id} />
        )}
        {["PENDING", "APPROVED"].includes(booking.status) && (
          <CancelBookingButton bookingId={booking.id} />
        )}
      </div>
    </div>
  );
}
