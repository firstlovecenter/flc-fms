import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Building2, User, FileText, Phone, MessageCircle, LogIn } from "lucide-react";
import { requirePerm } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDateTime, durationHours, cn } from "@/lib/utils";
import { type CeremonyDetails } from "@/lib/ceremony-utils";
import BookingActions from "@/components/bookings/BookingActions";
import CancelBookingButton from "@/components/bookings/CancelBookingButton";
import CompleteBookingButton from "@/components/bookings/CompleteBookingButton";
import SendSMSButton from "@/components/bookings/SendSMSButton";
import SendAccessCodeButton from "@/components/bookings/SendAccessCodeButton";
import DeleteBookingButton from "@/components/bookings/DeleteBookingButton";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";

function normalizeTel(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function normalizeWhatsApp(phone: string) {
  return phone.replace(/\D/g, "");
}

export default async function BookingDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await requirePerm("bookings:view");

  const booking = await prisma.booking.findFirst({
    where: { id: params.id },
    include: {
      facility: true,
      patron:   true,
      user:     { select: { name: true, email: true, role: true, phone: true } },
      approvedBy: { select: { name: true } },
      checkIn:  {
        include: {
          checkedInBy:  { select: { name: true } },
          checkedOutBy: { select: { name: true } },
        },
      },
    },
  });

  if (!booking) notFound();

  const canManage = session.role === "SUPER_ADMIN" || (session.authContext?.permissions["bookings:approve"] ?? false);
  const isSuperAdmin = session.role === "SUPER_ADMIN";
  const contact   = booking.patron ?? booking.user;
  const cd = booking.ceremonyDetails as CeremonyDetails | null;

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="flex items-start sm:items-center gap-3 flex-wrap">
        <Link href="/bookings" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-[var(--muted)]")}>
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{booking.title}</h1>
          {booking.description && <p className="page-subtitle mt-0.5">{booking.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Facility */}
        <Card className="p-5 gap-0 py-5">
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
        </Card>

        {/* Time */}
        <Card className="p-5 gap-0 py-5">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-3">
            <Clock size={13} /> Schedule
          </div>
          <p className="text-sm text-gray-800"><strong>From:</strong> {formatDateTime(booking.startTime)}</p>
          <p className="text-sm text-gray-800 mt-1"><strong>To:</strong> {formatDateTime(booking.endTime)}</p>
          <p className="text-xs text-[var(--muted)] mt-2">{durationHours(booking.startTime, booking.endTime)} hours</p>
        </Card>

        {/* Booker */}
        <Card className="p-5 gap-0 py-5">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-3">
            <User size={13} /> {booking.user ? "Staff booking" : "Patron booking"}
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
                  className="inline-flex items-center gap-1 text-xs text-success hover:underline"
                >
                  <MessageCircle size={12} /> WhatsApp
                </a>
              </div>
            </>
          )}
          {booking.patron && booking.user && (
            <p className="text-xs text-[var(--muted)] mt-2">Booked by {booking.user.name} (staff)</p>
          )}
        </Card>
      </div>

      {/* Amount */}
      <Card className="p-6 gap-0 py-6">
        <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-4">
          <FileText size={13} /> Booking Amount
        </div>
        <p className="text-3xl font-bold text-[var(--navy)]">{formatCurrency(Number(booking.totalAmount))}</p>
      </Card>

      {booking.notes && (
        <Card className="p-5 gap-0 py-5">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-semibold uppercase tracking-wide mb-2">
            <FileText size={13} /> Notes
          </div>
          <p className="text-sm text-[var(--slate)]">{booking.notes}</p>
        </Card>
      )}

      {/* Ceremony Details */}
      {cd && (
        <Card className="p-5 gap-0 py-5">
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

      {/* Check-In / Check-Out Status */}
      {(booking.checkIn || booking.checkInRequested) && (
        <Card className={cn("p-5 gap-0 py-5", booking.checkIn ? "bg-success/10 border-success/25" : "bg-warning/10 border-warning/25")}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-2 text-[var(--muted)]">
            <LogIn size={13} /> Check-In Status
          </div>
          {booking.checkIn ? (
            <div className="text-sm space-y-1">
              <p className="text-success">
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
            <p className="text-sm text-warning">Patron has requested check-in. <a href="/checkin" className="underline font-semibold">Go to Check-In page →</a></p>
          )}
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {canManage && booking.status === "PENDING" && (
          <BookingActions bookingId={booking.id} />
        )}
        {canManage && booking.status === "APPROVED" && (
          <CompleteBookingButton bookingId={booking.id} />
        )}
        {canManage && ["PENDING", "APPROVED"].includes(booking.status) && (
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
        {canManage && contact?.phone && booking.status === "APPROVED" && booking.facility?.hasAccessCode && booking.facility.accessCode && (
          <SendAccessCodeButton
            bookingId={booking.id}
            bookerName={contact.name}
          />
        )}
        {isSuperAdmin && <DeleteBookingButton bookingId={booking.id} redirectTo="/bookings" />}
      </div>
    </div>
  );
}
