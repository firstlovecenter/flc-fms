import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import BookingsListClient from "@/components/bookings/BookingsListClient";

const STATUSES = ["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"];

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const session  = await requireStaff();

  const status = searchParams.status && searchParams.status !== "ALL"
    ? searchParams.status as any
    : undefined;
  const page = Number(searchParams.page ?? 1);
  const take = 20;

  const where = {
    ...(status ? { status } : {}),
  };

  const [bookings, total, facilities, categories] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      include: {
        facility: { select: { id: true, name: true } },
        patron:   { select: { name: true, phone: true, email: true } },
        user:     { select: { name: true, phone: true, email: true } },
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
  const canManage = ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"].includes(session.role);
  const canCreateBookings = canManage;

  // Sort: PENDING first, then by startTime descending
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
      id: b.id,
      title: b.title,
      description: b.description,
      facilityId: b.facilityId,
      facilityName: b.facility?.name ?? "N/A",
      category: b.category,
      status: b.status,
      totalAmount: Number(b.totalAmount),
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      notes: b.notes,
      rejectionReason: b.rejectionReason,
      bookerName: booker?.name ?? "-",
      bookerPhone: booker?.phone ?? null,
      bookerEmail: booker?.email ?? null,
    };
  });

  const facilityOptions = facilities.map((f) => ({
    id: f.id,
    name: f.name,
    categories: f.pricing.map((p) => p.category),
  }));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]">Bookings</h1>
          <p className="text-sm text-[var(--muted)]">{total} total</p>
        </div>
        {canCreateBookings && (
          <Link href="/bookings/new" className="btn-primary text-sm">
            <Plus size={15} /> New Booking
          </Link>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => {
          const active = (searchParams.status ?? "ALL") === s;
          return (
            <Link key={s} href={`/bookings?status=${s}`} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${active ? "bg-[var(--navy)] text-white border-[var(--navy)]" : "bg-white text-[var(--slate)] border-[var(--border)] hover:border-[var(--navy)]"}`}>
              {s}
            </Link>
          );
        })}
      </div>

      <BookingsListClient
        initialBookings={bookingRows}
        canManage={canManage}
        facilities={facilityOptions}
        categories={categories}
      />

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-[var(--slate)] pt-2">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={`/bookings?status=${searchParams.status ?? "ALL"}&page=${page - 1}`} className="btn-secondary text-xs px-3 py-1.5">← Prev</Link>}
            {page < pages && <Link href={`/bookings?status=${searchParams.status ?? "ALL"}&page=${page + 1}`} className="btn-secondary text-xs px-3 py-1.5">Next →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
