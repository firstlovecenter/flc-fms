import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDateTime, statusBadgeClass } from "@/lib/utils";
import BookingActions from "@/components/bookings/BookingActions";

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

  const [bookings, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      include: {
        facility: { select: { name: true } },
        patron:   { select: { name: true, phone: true } },
        user:     { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.booking.count({ where }),
  ]);

  const pages = Math.ceil(total / take);
  const canManage = ["FACILITY_MANAGER", "SUPER_ADMIN"].includes(session.role);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]">Bookings</h1>
          <p className="text-sm text-[var(--muted)]">{total} total</p>
        </div>
        {canManage && (
          <Link href="/bookings/new" className="btn-primary text-sm">
            <Plus size={15} /> New Booking
          </Link>
        )}
      </div>

      {/* Status filter pills */}
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

      {/* List */}
      <div className="space-y-2">
        {bookings.length === 0 ? (
          <div className="card p-10 text-center text-[var(--muted)]">No bookings found.</div>
        ) : bookings.map((b) => {
          const booker = b.patron ?? b.user;
          return (
            <Link key={b.id} href={`/bookings/${b.id}`} className="card block hover:shadow-md transition-shadow" style={{ padding: "12px 16px" }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--navy)] text-sm truncate">{b.title}</span>
                    <span className={`badge text-[0.65rem] ${statusBadgeClass(b.status)}`}>{b.status}</span>
                    {b.paymentStatus === "PAID" && <span className="badge badge-paid text-[0.65rem]">PAID</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted)]">
                    <span>{booker?.name ?? "—"}</span>
                    <span>•</span>
                    <span>{b.facility?.name ?? "N/A"}</span>
                    <span>•</span>
                    <span>{formatDateTime(b.startTime)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-semibold text-[var(--gold)] text-sm">{formatCurrency(Number(b.totalAmount))}</span>
                  {canManage && b.status === "PENDING" && (
                    <div onClick={(e) => e.preventDefault()}>
                      <BookingActions bookingId={b.id} />
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
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
