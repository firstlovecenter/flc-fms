import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Building2, FileText } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDateTime, durationHours } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { type CeremonyDetails } from "@/lib/ceremony-utils";
import CancelBookingButton from "@/components/bookings/CancelBookingButton";
import CheckInRequestButton from "@/components/patron/CheckInRequestButton";

import { Card } from "@/components/ui/card";

export default async function PatronBookingDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== "PATRON") redirect("/patron/login");

  const booking = await prisma.booking.findFirst({
    // userId: null excludes staff-created bookings merely linked to this
    // patron for notifications — only self-made bookings are reachable here.
    where: { id: params.id, patronId: session.sub, userId: null },
    include: {
      facility: true,
      lineItems: {
        include: { item: true, bundle: true },
      },
      approvedBy: { select: { name: true } },
      checkIn: true,
    },
  });

  if (!booking) notFound();

  const cd = booking.ceremonyDetails as CeremonyDetails | null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/patron/bookings" className="p-2 rounded-lg hover:bg-gray-100 text-[var(--muted)]">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{booking.title}</h1>
          {booking.description && <p className="page-subtitle mt-0.5">{booking.description}</p>}
        </div>
        <div className="flex gap-2">
          <StatusBadge status={booking.status} size="sm" />
        </div>
      </div>

      {booking.rejectionReason && (
        <div className="bg-danger/10 border border-danger/25 rounded-lg p-4 text-danger text-sm">
          <strong>Rejection reason:</strong> {booking.rejectionReason}
        </div>
      )}

      {(booking.status === "APPROVED" || booking.status === "COMPLETED") && (
        <div className="bg-success/10 border border-success/25 rounded-lg p-4 text-sm">
          <strong className="text-success">Approved by:</strong>{" "}
          {booking.approvedBy ? (
            <span className="text-[var(--navy)]">
              {booking.approvedBy.name}
              {booking.approvedAt && <> on {formatDateTime(booking.approvedAt)}</>}
            </span>
          ) : (
            <span className="text-[var(--muted)]">Auto-approved via payment code — no staff approver on record.</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Facility */}
        {booking.facility && (
          <Card className="p-5">
            <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-3">
              <Building2 size={13} /> Facility
            </div>
            <p className="font-semibold text-[var(--navy)]">{booking.facility.name}</p>
            <p className="text-sm page-subtitle">Cap. {booking.facility.capacity.toLocaleString()}</p>
          </Card>
        )}

        {/* Time */}
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-3">
            <Clock size={13} /> Schedule
          </div>
          <p className="text-sm text-gray-800"><strong>From:</strong> {formatDateTime(booking.startTime)}</p>
          <p className="text-sm text-gray-800 mt-1"><strong>To:</strong> {formatDateTime(booking.endTime)}</p>
          <p className="text-xs text-[var(--muted)] mt-2">{durationHours(booking.startTime, booking.endTime)} hours</p>
        </Card>
      </div>

      {/* Line items */}
      {booking.lineItems.length > 0 && (
        <Card className="p-5">
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
        </Card>
      )}

      {/* Amount summary */}
      <Card className="p-6">
        <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-4">
          <FileText size={13} /> Booking Amount
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-[var(--navy)]">{formatCurrency(Number(booking.totalAmount))}</p>
            {booking.isBillingWaived && (
              <p className="text-sm text-success font-medium mt-1">Billing waived</p>
            )}
          </div>
        </div>
      </Card>

      {booking.notes && (
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-2">
            <FileText size={13} /> Notes
          </div>
          <p className="text-sm text-[var(--slate)] whitespace-pre-line">{booking.notes}</p>
        </Card>
      )}

      {/* Ceremony Details */}
      {cd && (
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-4">
            <FileText size={13} /> {cd.type === "wedding" ? "Wedding" : "Naming Ceremony"} Details
          </div>
          {cd.type === "wedding" ? (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {[
                  ["Bride's Name", cd.brideName],
                  ["Groom's Name", cd.groomName],
                  ["Contact (WhatsApp)", cd.contactWhatsApp],
                  ["Email", cd.email],
                  ["Bishop", `${cd.bishopName} (${cd.bishopPhone})`],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td className="py-2 pr-4 text-[var(--muted)] w-40">{label}</td>
                    <td className="py-2 font-medium text-[var(--navy)]">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-xs font-bold uppercase text-[var(--muted)] mb-2">Father</p>
                <p>{cd.fatherName}</p>
                <p className="text-[var(--muted)] text-xs">{cd.fatherPhone} / WA: {cd.fatherWhatsApp}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-[var(--muted)] mb-2">Child</p>
                <p>{cd.childrenNames}</p>
                <p className="text-[var(--muted)] text-xs">DOB: {cd.childBirthday}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-[var(--muted)] mb-2">Mother</p>
                <p>{cd.motherName}</p>
                <p className="text-[var(--muted)] text-xs">{cd.motherPhone}</p>
                {cd.email && <p className="text-[var(--muted)] text-xs">{cd.email}</p>}
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-[var(--muted)] mb-2">Officiating Clergy</p>
                <p>Pastor: {cd.pastorName} ({cd.pastorPhone})</p>
                <p>Bishop: {cd.bishopName} ({cd.bishopPhone})</p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Check-in status */}
      {booking.checkIn && (
        <Card className="p-5 bg-success/10 border-success/25">
          <p className="text-sm font-semibold text-success">✓ Checked in{booking.checkIn.checkedOutAt ? " & Checked out" : ""}</p>
          <p className="text-xs text-success mt-1">
            Checked in at {formatDateTime(booking.checkIn.checkedInAt)}
            {booking.checkIn.checkedOutAt && ` · Checked out at ${formatDateTime(booking.checkIn.checkedOutAt)}`}
          </p>
        </Card>
      )}
      {booking.checkInRequested && !booking.checkIn && (
        <Card className="p-5 bg-warning/10 border-warning/25">
          <p className="text-sm font-semibold text-warning">Check-in requested</p>
          <p className="text-xs text-warning mt-1">Waiting for staff to approve your check-in.</p>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {booking.status === "APPROVED" && !booking.checkInRequested && !booking.checkIn && (
          <CheckInRequestButton bookingId={booking.id} />
        )}
        {["PENDING", "APPROVED"].includes(booking.status) && (
          <CancelBookingButton bookingId={booking.id} />
        )}
      </div>
    </div>
  );
}
