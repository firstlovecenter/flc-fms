import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePerm } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";
import { FilterPills, ListPagination, SegmentLinks } from "@/components/layout/ListControls";
import BookingsListClient from "@/components/bookings/BookingsListClient";
import CeremonyBookingsTable, { type CeremonyBookingRow } from "@/components/bookings/CeremonyBookingsTable";
import { CEREMONY_CATEGORIES, type CeremonyDetails } from "@/lib/ceremony-utils";

const STATUSES = ["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"] as const;
const STATUS_LABELS: Record<(typeof STATUSES)[number], string> = {
  ALL: "All",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type Tab = "regular" | "ceremony";

export default async function BookingsPage(
  props: {
    searchParams: Promise<{ status?: string; page?: string; tab?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const session = await requirePerm("bookings:view");

  const tab    = (searchParams.tab ?? "regular") as Tab;
  const status = searchParams.status && searchParams.status !== "ALL"
    ? searchParams.status as any
    : undefined;
  const page = Number(searchParams.page ?? 1);
  const take = 20;

  const canManage = session.role === "SUPER_ADMIN" || (session.authContext?.permissions["bookings:approve"] ?? false);
  const isSuperAdmin = session.role === "SUPER_ADMIN";

  if (tab === "ceremony") {
    // ── Ceremony tab ──────────────────────────────────────────────────────────
    const tabWhere = {
      OR: [
        { ceremonyCode: { isNot: null } },
        { category: { in: [...CEREMONY_CATEGORIES] } },
      ],
      deletedAt: null,
    };
    const where = { ...tabWhere, ...(status ? { status } : {}) };

    const [bookings, total, statusCounts] = await prisma.$transaction([
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
      prisma.booking.groupBy({ by: ["status"], where: tabWhere, orderBy: { status: "asc" }, _count: { _all: true } }),
    ]);

    const ceremonyRows: CeremonyBookingRow[] = bookings.map((b) => {
      const booker = b.patron ?? b.user;
      const cd     = b.ceremonyDetails as CeremonyDetails | null;
      const ctype  = (cd?.type
        ?? b.ceremonyCode?.ceremonyType?.toLowerCase()
        ?? (b.category?.toUpperCase() === "WEDDING" ? "wedding" : b.category?.toUpperCase() === "NAMING" ? "naming" : null)) as "wedding" | "naming" | null;
      return {
        id:                b.id,
        title:             b.title,
        facilityName:      b.facility?.name ?? "N/A",
        status:            b.status,
        totalAmount:       Number(b.totalAmount),
        acRequested:       b.acRequested,
        startTime:         b.startTime.toISOString(),
        endTime:           b.endTime.toISOString(),
        bookerName:        booker?.name ?? "—",
        bookerPhone:       booker?.phone ?? null,
        bookerEmail:       booker?.email ?? null,
        createdByStaffName: b.user?.name ?? null,
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
      <div className="space-y-5 animate-fade-in">
        <BookingsHeader canManage={canManage} />
        <ListControls tab="ceremony" status={searchParams.status} counts={statusCounts} />

        <CeremonyBookingsTable
          bookings={ceremonyRows}
          canManage={canManage}
          isSuperAdmin={isSuperAdmin}
        />

        <ListPagination
          page={page}
          pageSize={take}
          total={total}
          hrefFor={(p) => `/bookings?tab=ceremony&status=${searchParams.status ?? "ALL"}&page=${p}`}
        />
      </div>
    );
  }

  // ── Regular tab ─────────────────────────────────────────────────────────────
  const tabWhere = {
    ceremonyCode: null,
    category: { notIn: [...CEREMONY_CATEGORIES] },
    deletedAt: null,
  };
  const where = { ...tabWhere, ...(status ? { status } : {}) };

  const [bookings, total, facilities, categories, statusCounts] = await prisma.$transaction([
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
    prisma.booking.groupBy({ by: ["status"], where: tabWhere, orderBy: { status: "asc" }, _count: { _all: true } }),
  ]);

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
      acRequested:     b.acRequested,
      startTime:       b.startTime.toISOString(),
      endTime:         b.endTime.toISOString(),
      notes:           b.notes,
      rejectionReason: b.rejectionReason,
      bookerName:      booker?.name ?? "-",
      bookerPhone:     booker?.phone ?? null,
      bookerEmail:     booker?.email ?? null,
      createdByStaffName: b.user?.name ?? null,
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
    <div className="space-y-5 animate-fade-in">
      <BookingsHeader canManage={canManage} />
      <ListControls tab="regular" status={searchParams.status} counts={statusCounts} />

      <BookingsListClient
        initialBookings={bookingRows}
        canManage={canManage}
        isSuperAdmin={isSuperAdmin}
        facilities={facilityOptions}
        categories={categories}
      />

      <ListPagination
        page={page}
        pageSize={take}
        total={total}
        hrefFor={(p) => `/bookings?tab=regular&status=${searchParams.status ?? "ALL"}&page=${p}`}
      />
    </div>
  );
}

// ── Page pieces ───────────────────────────────────────────────────────────────

function BookingsHeader({ canManage }: { canManage: boolean }) {
  return (
    <PageHeader
      title="Bookings"
      description="Review requests, keep track of upcoming use, and reach bookers. Pending requests are listed first."
      actions={canManage ? (
        <>
          <Link href="/bookings/new?type=wedding" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
            <Plus size={15} /> Wedding
          </Link>
          <Link href="/bookings/new?type=naming" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
            <Plus size={15} /> Naming
          </Link>
          <Link href="/bookings/new" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
            <Plus size={15} /> New booking
          </Link>
        </>
      ) : undefined}
      className="mb-0"
    />
  );
}

/** Regular / ceremony tabs, then the status pills with a count for each. */
function ListControls({
  tab,
  status,
  counts,
}: {
  tab: Tab;
  status?: string;
  counts: { status: string; _count: { _all: number } }[];
}) {
  const statusParam = status && status !== "ALL" ? `&status=${status}` : "";
  const countFor = (s: string) =>
    s === "ALL"
      ? counts.reduce((n, c) => n + c._count._all, 0)
      : counts.find((c) => c.status === s)?._count._all ?? 0;
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <SegmentLinks
        label="Booking type"
        value={tab}
        tabs={[
          { value: "regular", label: "Regular", href: `/bookings?tab=regular${statusParam}` },
          { value: "ceremony", label: "Ceremonies", href: `/bookings?tab=ceremony${statusParam}` },
        ]}
      />
      <FilterPills
        label="Status"
        value={status ?? "ALL"}
        options={STATUSES.map((s) => ({
          value: s,
          label: STATUS_LABELS[s],
          count: countFor(s),
          href: `/bookings?tab=${tab}&status=${s}`,
        }))}
      />
    </div>
  );
}
