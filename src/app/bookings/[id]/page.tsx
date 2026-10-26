import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, User, FileText, Phone, MessageCircle, LogIn, Wallet, ShieldCheck, ArrowUpRight } from "lucide-react";
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
import StatCard from "@/components/ui/StatCard";
import PageHeader from "@/components/layout/PageHeader";

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

  const actions = (
    <>
      {canManage && booking.status === "PENDING" && (
        <BookingActions bookingId={booking.id} />
      )}
      {canManage && booking.status === "APPROVED" && (
        <CompleteBookingButton bookingId={booking.id} />
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
      {canManage && ["PENDING", "APPROVED"].includes(booking.status) && (
        <CancelBookingButton bookingId={booking.id} />
      )}
      {isSuperAdmin && <DeleteBookingButton bookingId={booking.id} redirectTo="/bookings" />}
    </>
  );
  const hasActions = canManage || isSuperAdmin;

  return (
    <div className="w-full max-w-6xl space-y-5">
      <PageHeader
        back={{ href: "/bookings", label: "Bookings" }}
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
          <span><strong className="font-medium">Rejected:</strong> {booking.rejectionReason}</span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* ── Main ───────────────────────────────────────────── */}
        <div className="space-y-5">
          <Card className="gap-0 p-5 sm:p-6">
            <SectionTitle icon={<Clock size={14} />}>Schedule</SectionTitle>
            <Facts
              items={[
                { label: "Starts", value: formatDateTime(booking.startTime) },
                { label: "Ends", value: formatDateTime(booking.endTime) },
                { label: "Duration", value: `${durationHours(booking.startTime, booking.endTime)} hours` },
                {
                  label: "Facility",
                  value: booking.facilityId ? (
                    <Link href={`/facilities/${booking.facilityId}`} className="font-medium text-[var(--gold)] hover:underline">
                      {booking.facility?.name}
                    </Link>
                  ) : "N/A",
                },
                { label: "Capacity", value: booking.facility ? booking.facility.capacity.toLocaleString() : "N/A" },
                { label: "AC requested", value: booking.acRequested ? "Yes — cash donation at the Front Office" : "No" },
              ]}
            />
          </Card>

          <Card className="gap-0 p-5 sm:p-6">
            <SectionTitle icon={<User size={14} />}>{booking.user && !booking.patron ? "Staff booking" : "Booker"}</SectionTitle>
            <Facts
              items={[
                { label: "Name", value: contact?.name ?? "—" },
                contact?.email ? { label: "Email", value: contact.email } : null,
                contact?.phone ? { label: "Phone", value: contact.phone } : null,
                booking.patron && booking.user ? { label: "Booked by", value: `${booking.user.name} (staff)` } : null,
              ]}
            />
            {contact?.phone && (
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`tel:${normalizeTel(contact.phone)}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3.5 text-xs font-medium text-[var(--navy)] shadow-[var(--shadow-xs)] hover:bg-muted"
                >
                  <Phone size={13} /> Call
                </a>
                <a
                  href={`https://wa.me/${normalizeWhatsApp(contact.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3.5 text-xs font-medium text-success shadow-[var(--shadow-xs)] hover:bg-success/10"
                >
                  <MessageCircle size={13} /> WhatsApp
                </a>
              </div>
            )}
          </Card>

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
            sub={booking.acRequested ? "Plus AC — cash donation at the Front Office" : "No AC requested"}
          />

          {hasActions && (
            <Card className="gap-0 p-5">
              <SectionTitle>Actions</SectionTitle>
              <div className="flex flex-wrap gap-2">{actions}</div>
            </Card>
          )}

          <Card className="gap-0 p-5">
            <SectionTitle icon={<ShieldCheck size={14} />}>Approval</SectionTitle>
            {booking.status === "APPROVED" || booking.status === "COMPLETED" ? (
              booking.approvedBy ? (
                <p className="text-sm text-[var(--navy)]">
                  Approved by <span className="font-medium">{booking.approvedBy.name}</span>
                  {booking.approvedAt && <span className="text-[var(--muted)]"> · {formatDateTime(booking.approvedAt)}</span>}
                </p>
              ) : (
                <p className="text-sm text-[var(--muted)]">Auto-approved via payment code — no staff approver on record.</p>
              )
            ) : booking.status === "PENDING" ? (
              <p className="text-sm text-[var(--muted)]">Waiting for a booking manager to approve or reject.</p>
            ) : (
              <p className="text-sm text-[var(--muted)]">Not approved.</p>
            )}
          </Card>

          {(booking.checkIn || booking.checkInRequested) && (
            <Card className="gap-0 p-5">
              <SectionTitle icon={<LogIn size={14} />}>Check-in</SectionTitle>
              {booking.checkIn ? (
                <div className="space-y-1.5 text-sm">
                  <p className="text-[var(--navy)]">
                    <span className="font-medium text-success">Checked in</span> by {booking.checkIn.checkedInBy.name}
                    <span className="text-[var(--muted)]"> · {formatDateTime(booking.checkIn.checkedInAt)}</span>
                  </p>
                  {booking.checkIn.checkedOutAt && booking.checkIn.checkedOutBy && (
                    <p className="text-[var(--navy)]">
                      <span className="font-medium">Checked out</span> by {booking.checkIn.checkedOutBy.name}
                      <span className="text-[var(--muted)]"> · {formatDateTime(booking.checkIn.checkedOutAt)}</span>
                    </p>
                  )}
                  {booking.checkIn.notes && (
                    <p className="whitespace-pre-line pt-1 text-xs text-[var(--muted)]">{booking.checkIn.notes}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <p className="flex items-center gap-2 text-[var(--navy)]">
                    <span aria-hidden className="size-2 shrink-0 animate-pulse rounded-full bg-warning" />
                    The booker has asked to check in.
                  </p>
                  <Link href="/checkin" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-1.5")}>
                    Go to check-in <ArrowUpRight size={14} />
                  </Link>
                </div>
              )}
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
