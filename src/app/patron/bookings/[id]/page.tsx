import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Building2, CreditCard, FileText } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDateTime, statusBadgeClass, durationHours } from "@/lib/utils";
import PayNowButton from "@/components/patron/PayNowButton";
import CancelBookingButton from "@/components/bookings/CancelBookingButton";

export default async function PatronBookingDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { payment?: string } }) {
  const session = await getSession();
  if (!session || session.role !== "PATRON") redirect("/patron/login");

  const booking = await prisma.booking.findFirst({
    where: { id: params.id, patronId: session.sub },
    include: {
      facility: true,
      payment: true,
      receipt: true,
      lineItems: {
        include: { item: true, bundle: true },
      },
    },
  });

  if (!booking) notFound();

  const canPay =
    ["APPROVED", "COMPLETED"].includes(booking.status) &&
    booking.paymentStatus !== "PAID" &&
    !booking.isBillingWaived &&
    Number(booking.totalAmount) > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Payment status toast */}
      {searchParams.payment === "processing" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          <strong>Payment received!</strong> We&apos;re verifying your payment. This page will update shortly.
        </div>
      )}
      {searchParams.payment === "success" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
          <strong>Payment confirmed!</strong> Your booking has been paid successfully.
        </div>
      )}

      <div className="flex items-center gap-3">
        <Link href="/patron/bookings" className="p-2 rounded-lg hover:bg-gray-100 text-[var(--muted)]">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Facility */}
        {booking.facility && (
          <div className="card p-5">
            <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-3">
              <Building2 size={13} /> Facility
            </div>
            <p className="font-semibold text-[var(--navy)]">{booking.facility.name}</p>
            <p className="text-sm page-subtitle">Cap. {booking.facility.capacity.toLocaleString()}</p>
          </div>
        )}

        {/* Time */}
        <div className="card p-5">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-3">
            <Clock size={13} /> Schedule
          </div>
          <p className="text-sm text-gray-800"><strong>From:</strong> {formatDateTime(booking.startTime)}</p>
          <p className="text-sm text-gray-800 mt-1"><strong>To:</strong> {formatDateTime(booking.endTime)}</p>
          <p className="text-xs text-[var(--muted)] mt-2">{durationHours(booking.startTime, booking.endTime)} hours</p>
        </div>
      </div>

      {/* Line items */}
      {booking.lineItems.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-3">
            <FileText size={13} /> Items
          </div>
          <div className="space-y-2">
            {booking.lineItems.map(li => (
              <div key={li.id} className="flex items-center justify-between text-sm">
                <span className="text-[var(--navy)]">
                  {li.item?.name ?? li.bundle?.name ?? "Item"} × {li.quantity}
                </span>
                <span className="font-medium text-[var(--slate)]">{formatCurrency(Number(li.subtotal))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment summary */}
      <div className="card p-6">
        <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-4">
          <CreditCard size={13} /> Payment
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-[var(--navy)]">{formatCurrency(Number(booking.totalAmount))}</p>
            {booking.isBillingWaived && (
              <p className="text-sm text-green-600 font-medium mt-1">Billing waived</p>
            )}
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
          <p className="text-sm text-[var(--slate)] whitespace-pre-line">{booking.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {canPay && <PayNowButton bookingId={booking.id} />}
        {["PENDING", "APPROVED"].includes(booking.status) && (
          <CancelBookingButton bookingId={booking.id} />
        )}
      </div>
    </div>
  );
}
