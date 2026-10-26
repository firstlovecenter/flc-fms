import { notFound, redirect } from "next/navigation";
import { Clock, FileText, LogIn, Package, Wallet } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDateTime, durationHours } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { type CeremonyDetails } from "@/lib/ceremony-utils";
import CancelBookingButton from "@/components/bookings/CancelBookingButton";
import CheckInRequestButton from "@/components/patron/CheckInRequestButton";
import StatCard from "@/components/ui/StatCard";
import PageHeader from "@/components/layout/PageHeader";

import { Card } from "@/components/ui/card";

export default async function PatronBookingDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
      checkIn: true,
    },
  });

  if (!booking) notFound();

  const cd = booking.ceremonyDetails as CeremonyDetails | null;

  const canCheckIn = booking.status === "APPROVED" && !booking.checkInRequested && !booking.checkIn;
  const canCancel = ["PENDING", "APPROVED"].includes(booking.status);

  return (
    <div className="w-full space-y-5">
      <PageHeader
        back={{ href: "/patron/bookings", label: "My bookings" }}
        title={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            {booking.title}
            <StatusBadge status={booking.status} size="md" />
          </span>
        }
        description={booking.description ?? undefined}
        meta={`${booking.facility?.name ?? "No facility"} · ${formatDateTime(booking.startTime)}`}
        className="mb-0"
      />

      {booking.rejectionReason && (
        <div className="alert alert-error">
          <span><strong className="font-medium">Not approved:</strong> {booking.rejectionReason}</span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* ── Main ───────────────────────────────────────────── */}
        <div className="space-y-5">
          <Card className="gap-0 p-5 sm:p-6">
            <SectionTitle icon={<Clock size={14} />}>Schedule</SectionTitle>
            <Facts
              items={[
                { label: "Starts", value: formatDateTime(booking.startTime) },
                { label: "Ends", value: formatDateTime(booking.endTime) },
                { label: "Duration", value: `${durationHours(booking.startTime, booking.endTime)} hours` },
                booking.facility ? { label: "Facility", value: booking.facility.name } : null,
                booking.facility ? { label: "Capacity", value: booking.facility.capacity.toLocaleString() } : null,
                { label: "AC requested", value: booking.acRequested ? "Yes — cash donation at the Front Office" : "No" },
              ]}
            />
          </Card>

          {booking.lineItems.length > 0 && (
            <Card className="gap-0 p-5 sm:p-6">
              <SectionTitle icon={<Package size={14} />}>Items</SectionTitle>
              <ul className="divide-y divide-border/70 rounded-2xl border border-border/70">
                {booking.lineItems.map((li) => (
                  <li key={li.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                    <span className="min-w-0 text-[var(--navy)]">
                      <span className="font-medium tabular-nums">{li.quantity}×</span> {li.item?.name ?? li.bundle?.name ?? "Item"}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-[var(--navy)]">{formatCurrency(Number(li.subtotal))}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {cd && (
            <Card className="gap-0 p-5 sm:p-6">
              <SectionTitle icon={<FileText size={14} />}>{cd.type === "wedding" ? "Wedding" : "Naming ceremony"}</SectionTitle>
              {cd.type === "wedding" ? (
                <Facts
                  items={[
                    { label: "Bride", value: cd.brideName },
                    { label: "Groom", value: cd.groomName },
                    { label: "Contact (WhatsApp)", value: cd.contactWhatsApp },
                    { label: "Email", value: cd.email },
                    { label: "Bishop", value: `${cd.bishopName} (${cd.bishopPhone})` },
                  ]}
                />
              ) : (
                <Facts
                  items={[
                    { label: "Child", value: cd.childrenNames },
                    { label: "Date of birth", value: cd.childBirthday },
                    { label: "Father", value: `${cd.fatherName} · ${cd.fatherPhone} · WA ${cd.fatherWhatsApp}` },
                    { label: "Mother", value: `${cd.motherName} · ${cd.motherPhone}` },
                    cd.email ? { label: "Email", value: cd.email } : null,
                    { label: "Pastor", value: `${cd.pastorName} (${cd.pastorPhone})` },
                    { label: "Bishop", value: `${cd.bishopName} (${cd.bishopPhone})` },
                  ]}
                />
              )}
            </Card>
          )}

          {booking.notes && (
            <Card className="gap-0 p-5 sm:p-6">
              <SectionTitle icon={<FileText size={14} />}>Notes</SectionTitle>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--navy)]">{booking.notes}</p>
            </Card>
          )}
        </div>

        {/* ── Side ───────────────────────────────────────────── */}
        <aside className="space-y-5">
          <StatCard
            hero
            label="Booking amount"
            value={formatCurrency(Number(booking.totalAmount))}
            icon={<Wallet />}
            sub={booking.isBillingWaived ? "Billing waived" : booking.acRequested ? "Plus AC — cash donation at the Front Office" : "No AC requested"}
          />

          <Card className="gap-0 p-5">
            <SectionTitle icon={<LogIn size={14} />}>Check-in</SectionTitle>
            {booking.checkIn ? (
              <div className="space-y-1.5 text-sm">
                <p className="font-medium text-success">
                  Checked in{booking.checkIn.checkedOutAt ? " and out" : ""}
                </p>
                <p className="text-[var(--muted)]">
                  In at {formatDateTime(booking.checkIn.checkedInAt)}
                  {booking.checkIn.checkedOutAt && <> · out at {formatDateTime(booking.checkIn.checkedOutAt)}</>}
                </p>
              </div>
            ) : booking.checkInRequested ? (
              <p className="flex items-center gap-2 text-sm text-[var(--navy)]">
                <span aria-hidden className="size-2 shrink-0 animate-pulse rounded-full bg-warning" />
                Requested — waiting for staff to check you in.
              </p>
            ) : booking.status === "APPROVED" ? (
              <p className="text-sm text-[var(--muted)]">When you arrive, request check-in and staff will confirm it.</p>
            ) : (
              <p className="text-sm text-[var(--muted)]">Available once your booking is approved.</p>
            )}
          </Card>

          {(canCheckIn || canCancel) && (
            <Card className="gap-0 p-5">
              <SectionTitle>Actions</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {canCheckIn && <CheckInRequestButton bookingId={booking.id} />}
                {canCancel && <CancelBookingButton bookingId={booking.id} />}
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
      {icon}
      {children}
    </h2>
  );
}

/** Label/value pairs; empty rows are skipped. */
function Facts({ items }: { items: ({ label: string; value: React.ReactNode } | null)[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
      {items.map((item) =>
        item && item.value !== null && item.value !== undefined && item.value !== "" ? (
          <div key={item.label} className="min-w-0">
            <dt className="text-xs text-[var(--muted)]">{item.label}</dt>
            <dd className="mt-0.5 break-words text-[var(--navy)]">{item.value}</dd>
          </div>
        ) : null
      )}
    </dl>
  );
}
