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
        patron:   { select: { name: true, email: true } },
        user:     { select: { name: true, email: true } },
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
    <div className="space-y-6 animate-fade-in" style={{ position: "relative" }}>
      {/* Decorative background */}
      <div style={{
        position: "absolute",
        top: -100,
        right: -80,
        width: 350,
        height: 350,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      {/* Header */}
      <div className="card" style={{
        padding: "24px 28px",
        background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
        borderColor: "rgba(200,163,90,0.3)",
        position: "relative",
        zIndex: 1,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16
      }}>
        <div style={{ color: "#fff" }}>
          <p style={{ 
            fontSize: "0.7rem", 
            textTransform: "uppercase", 
            letterSpacing: "0.08em", 
            color: "rgba(255,255,255,0.6)", 
            marginBottom: 8,
            fontWeight: 700
          }}>
            Management
          </p>
          <h1 style={{ 
            fontFamily: "var(--font-display)", 
            fontSize: "clamp(1.75rem, 2.5vw, 2.5rem)", 
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 4
          }}>
            Bookings
          </h1>
          <p style={{ 
            fontSize: "0.95rem", 
            color: "rgba(255,255,255,0.75)" 
          }}>
            {total} total booking{total !== 1 ? "s" : ""} • Manage all facility reservations
          </p>
        </div>
        {canManage && (
          <Link href="/bookings/new" className="btn-gold" style={{ flexShrink: 0, marginTop: 8 }}>
            <Plus size={15} /> New Booking
          </Link>
        )}
      </div>

      {/* Status filter pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
        {STATUSES.map((s) => {
          const active = (searchParams.status ?? "ALL") === s;
          return (
            <Link key={s} href={`/bookings?status=${s}`} style={{
              padding: "8px 16px", 
              borderRadius: "20px", 
              fontSize: "0.8rem", 
              fontWeight: 600,
              textDecoration: "none", 
              transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
              background: active 
                ? "linear-gradient(135deg, var(--navy) 0%, rgba(28, 48, 88, 1) 100%)"
                : "rgba(255, 255, 255, 0.12)",
              color: active ? "white" : "var(--slate)",
              border: `1.5px solid ${active ? "rgba(200, 163, 90, 0.3)" : "rgba(200, 163, 90, 0.15)"}`,
              boxShadow: active 
                ? "0 4px 12px rgba(10, 22, 40, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                : "0 2px 8px rgba(10, 22, 40, 0.04)",
              backdropFilter: "blur(8px)",
              cursor: "pointer",
              transform: active ? "translateY(-2px)" : "translateY(0)",
            }}>
              {s}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="card overflow-hidden" style={{
        background: "linear-gradient(135deg, #FFFFFF 0%, #FEFDFB 100%)",
        boxShadow: "0 2px 8px rgba(10,22,40,0.04), 0 1px 3px rgba(10,22,40,0.06)",
        position: "relative",
        zIndex: 1
      }}>
        {bookings.length === 0 ? (
          <div style={{ 
            padding: "60px 24px", 
            textAlign: "center", 
            color: "var(--muted)" 
          }}>
            <p style={{ fontSize: "1rem" }}>No bookings found.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking</th><th>Facility</th><th>Booked By</th>
                  <th>Date & Time</th><th>Amount</th><th>Status</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link href={`/bookings/${b.id}`} style={{ fontWeight: 600, color: "var(--navy)", textDecoration: "none" }}>{b.title}</Link>
                      {b.description && <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>{b.description}</p>}
                    </td>
                      <td style={{ color: "var(--slate)", fontWeight: 500 }}>{b.facility?.name ?? "N/A"}</td>
                    <td>
                      <span style={{ color: "var(--navy)", fontWeight: 500 }}>{(b.patron ?? b.user)?.name ?? "—"}</span>
                      <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{(b.patron ?? b.user)?.email ?? ""}</p>
                    </td>
                    <td>
                      <span style={{ color: "var(--navy)", fontSize: "0.85rem", fontWeight: 500 }}>{formatDateTime(b.startTime)}</span>
                      <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>to {formatDateTime(b.endTime)}</p>
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--gold)", fontFamily: "var(--font-display)", fontSize: "1rem" }}>{formatCurrency(Number(b.totalAmount))}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass(b.status)}`}>{b.status}</span>
                      {b.paymentStatus === "PAID" && <span className="badge badge-paid" style={{ marginLeft: 4 }}>PAID</span>}
                    </td>
                    {canManage && (
                      <td>{b.status === "PENDING" && <BookingActions bookingId={b.id} />}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          fontSize: "0.85rem", 
          color: "var(--slate)",
          position: "relative",
          zIndex: 1,
          padding: "16px 20px",
          background: "rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(200, 163, 90, 0.15)",
          borderRadius: "var(--r-md)",
          fontWeight: 500,
        }}>
          <span>Page <strong style={{ color: "var(--gold)" }}>{page}</strong> of <strong style={{ color: "var(--gold)" }}>{pages}</strong></span>
          <div style={{ display: "flex", gap: 8 }}>
            {page > 1 && (
              <Link 
                href={`/bookings?status=${searchParams.status ?? "ALL"}&page=${page - 1}`} 
                className="btn-secondary" 
                style={{ padding: "8px 14px", fontSize: "0.8rem", fontWeight: 600 }}>
                ← Prev
              </Link>
            )}
            {page < pages && (
              <Link 
                href={`/bookings?status=${searchParams.status ?? "ALL"}&page=${page + 1}`} 
                className="btn-secondary" 
                style={{ padding: "8px 14px", fontSize: "0.8rem", fontWeight: 600 }}>
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
