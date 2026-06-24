import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";
import BookingsListClient from "@/components/bookings/BookingsListClient";
import CeremonyBookingsTable, { type CeremonyBookingRow } from "@/components/bookings/CeremonyBookingsTable";
import type { CeremonyDetails } from "@/lib/ceremony-utils";

const STATUSES = ["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"];

type Tab = "regular" | "ceremony";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string; tab?: string };
}) {
  const session  = await requireStaff();

  const tab    = (searchParams.tab ?? "regular") as Tab;
  const status = searchParams.status && searchParams.status !== "ALL"
    ? searchParams.status as any
    : undefined;
  const page = Number(searchParams.page ?? 1);
  const take = 20;

  const canManage   = ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"].includes(session.role);
  const isSuperAdmin = session.role === "SUPER_ADMIN";

  if (tab === "ceremony") {
    // ── Ceremony tab ──────────────────────────────────────────────────────────
    const where = {
      ceremonyCode: { isNot: null },
      ...(status ? { status } : {}),
      deletedAt: null,
    };

    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        include: {
          facility:     { select: { id: true, name: true } },
          patron:       { select: { name: true, phone: true, email: true } },
          user:         { select: { name: true, phone: true, email: true } },
          ceremonyCode: { select: { code: true, ceremonyType: true } },
        },
        orderBy: [{ status: "asc" }, { startTime: "asc" }],
        skip: (page - 1) * take,
        take,
      }),
      prisma.booking.count({ where }),
    ]);

    const pages = Math.ceil(total / take);

    const ceremonyRows: CeremonyBookingRow[] = bookings.map((b) => {
      const booker = b.patron ?? b.user;
      const cd     = b.ceremonyDetails as CeremonyDetails | null;
      const ctype  = b.ceremonyCode?.ceremonyType?.toLowerCase() as "wedding" | "naming" | null ?? null;
      return {
        id:                b.id,
        title:             b.title,
        facilityName:      b.facility?.name ?? "N/A",
        status:            b.status,
        totalAmount:       Number(b.totalAmount),
        startTime:         b.startTime.toISOString(),
        endTime:           b.endTime.toISOString(),
        bookerName:        booker?.name ?? "—",
        bookerPhone:       booker?.phone ?? null,
        bookerEmail:       booker?.email ?? null,
        rejectionReason:   b.rejectionReason,
        notes:             b.notes,
        ceremonyType:      ctype,
        ceremonyCodeValue: b.ceremonyCode?.code ?? null,
        // Wedding fields
        brideName:         cd && cd.type === "wedding" ? cd.brideName    : null,
        groomName:         cd && cd.type === "wedding" ? cd.groomName    : null,
        contactWhatsApp:   cd && cd.type === "wedding" ? cd.contactWhatsApp : null,
        // Naming fields
        fatherName:        cd && cd.type === "naming"  ? cd.fatherName   : null,
        motherName:        cd && cd.type === "naming"  ? cd.motherName   : null,
        childrenNames:     cd && cd.type === "naming"  ? cd.childrenNames : null,
        childBirthday:     cd && cd.type === "naming"  ? cd.childBirthday : null,
        pastorName:        cd && cd.type === "naming"  ? cd.pastorName   : null,
      };
    });

    return (
      <div className="space-y-4 animate-fade-in">
        <PageHeader
          title="Bookings"
          description={`${total} ceremony booking${total !== 1 ? "s" : ""}`}
          actions={canManage ? (
            <>
              <Link href="/bookings/new" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
                <Plus size={15} /> New Booking
              </Link>
              <Link href="/bookings/new?type=wedding" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
                <Plus size={15} /> New Wedding
              </Link>
              <Link href="/bookings/new?type=naming" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
                <Plus size={15} /> New Naming
              </Link>
            </>
          ) : undefined}
        />

        <TabBar tab="ceremony" status={searchParams.status} />

        <CeremonyBookingsTable
          bookings={ceremonyRows}
          canManage={canManage}
          isSuperAdmin={isSuperAdmin}
        />

        {pages > 1 && (
          <div className="flex items-center justify-between text-sm text-[var(--slate)] pt-2">
            <span>Page {page} of {pages}</span>
            <div className="flex gap-2">
            {page > 1 && <Link href={`/bookings?tab=ceremony&status=${searchParams.status ?? "ALL"}&page=${page - 1}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>← Prev</Link>}
            {page < pages && <Link href={`/bookings?tab=ceremony&status=${searchParams.status ?? "ALL"}&page=${page + 1}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Next →</Link>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Regular tab ─────────────────────────────────────────────────────────────
  const where = {
    ceremonyCode: null,
    ...(status ? { status } : {}),
    deletedAt: null,
  };

  const [bookings, total, facilities, categories] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      include: {
        facility: { select: { id: true, name: true } },
        patron:   { select: { name: true, phone: true, email: true } },
        user:     { select: { name: true, phone: true, email: true } },
        lineItems: {
          include: {
            item:   { select: { name: true, unit: true } },
            bundle: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.booking.count({ where }),
    prisma.facility.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        pricing: {
          where: { isActive: true },
          select: { category: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.bookingCategory.findMany({
      where: { isActive: true },
      select: { slug: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const pages = Math.ceil(total / take);

  const STATUS_PRIORITY: Record<string, number> = { PENDING: 0, APPROVED: 1, COMPLETED: 2, REJECTED: 3, CANCELLED: 4 };
  const sorted = [...bookings].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 5;
    const pb = STATUS_PRIORITY[b.status] ?? 5;
    if (pa !== pb) return pa - pb;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const bookingRows = sorted.map((b) => {
    const booker = b.patron ?? b.user;
    return {
      id:              b.id,
      title:           b.title,
      description:     b.description,
      facilityId:      b.facilityId,
      facilityName:    b.facility?.name ?? "N/A",
      category:        b.category,
      status:          b.status,
      totalAmount:     Number(b.totalAmount),
      startTime:       b.startTime.toISOString(),
      endTime:         b.endTime.toISOString(),
      notes:           b.notes,
      rejectionReason: b.rejectionReason,
      bookerName:      booker?.name ?? "-",
      bookerPhone:     booker?.phone ?? null,
      bookerEmail:     booker?.email ?? null,
      lineItems:       b.lineItems.map((li) => ({
        label:     li.item?.name ?? li.bundle?.name ?? "Item",
        unit:      li.item?.unit ?? null,
        quantity:  li.quantity,
        unitPrice: Number(li.unitPrice),
        subtotal:  Number(li.subtotal),
      })),
    };
  });

  const facilityOptions = facilities.map((f) => ({
    id: f.id,
    name: f.name,
    categories: f.pricing.map((p) => p.category),
  }));

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Bookings"
        description={`${total} regular booking${total !== 1 ? "s" : ""}`}
        actions={canManage ? (
          <>
            <Link href="/bookings/new" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
              <Plus size={15} /> New Booking
            </Link>
            <Link href="/bookings/new?type=wedding" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
              <Plus size={15} /> New Wedding
            </Link>
            <Link href="/bookings/new?type=naming" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
              <Plus size={15} /> New Naming
            </Link>
          </>
        ) : undefined}
      />

      <TabBar tab="regular" status={searchParams.status} />

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => {
          const active = (searchParams.status ?? "ALL") === s;
          return (
            <Link key={s} href={`/bookings?tab=regular&status=${s}`}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${active ? "bg-[var(--navy)] text-white border-[var(--navy)]" : "bg-white text-[var(--slate)] border-[var(--border)] hover:border-[var(--navy)]"}`}>
              {s}
            </Link>
          );
        })}
      </div>

      <BookingsListClient
        initialBookings={bookingRows}
        canManage={canManage}
        isSuperAdmin={isSuperAdmin}
        facilities={facilityOptions}
        categories={categories}
      />

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-[var(--slate)] pt-2">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={`/bookings?tab=regular&status=${searchParams.status ?? "ALL"}&page=${page - 1}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>← Prev</Link>}
            {page < pages && <Link href={`/bookings?tab=regular&status=${searchParams.status ?? "ALL"}&page=${page + 1}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Next →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab navigation component ──────────────────────────────────────────────────

function TabBar({ tab, status }: { tab: Tab; status?: string }) {
  const statusParam = status && status !== "ALL" ? `&status=${status}` : "";
  return (
    <div className="flex gap-1 border-b border-[var(--border)]">
      <Link
        href={`/bookings?tab=regular${statusParam}`}
        className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
          tab === "regular"
            ? "border-[var(--navy)] text-[var(--navy)]"
            : "border-transparent text-[var(--muted)] hover:text-[var(--slate)] hover:border-gray-300"
        }`}
      >
        Regular Bookings
      </Link>
      <Link
        href={`/bookings?tab=ceremony${statusParam}`}
        className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
          tab === "ceremony"
            ? "border-[var(--navy)] text-[var(--navy)]"
            : "border-transparent text-[var(--muted)] hover:text-[var(--slate)] hover:border-gray-300"
        }`}
      >
        Ceremony Bookings
      </Link>
    </div>
  );
}
