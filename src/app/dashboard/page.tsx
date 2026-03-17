import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTotalIncomeIncludingBookingRevenue } from "@/lib/finance";
import { formatCurrency } from "@/lib/utils";
import StatCard from "@/components/ui/StatCard";
import RecentBookings from "@/components/bookings/RecentBookings";
import Link from "next/link";
import {
  Building2,
  CalendarDays,
  Wrench,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  ClipboardList,
  Package,
  BarChart3,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await requireStaff();

  const [
    totalFacilities, pendingBookings, activeBookings, openMaintenance,
    pendingExpenses, incomeTotals, expenseTotal,
  ] = await Promise.all([
    prisma.facility.count({ where: { isActive: true } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { status: "APPROVED" } }),
    prisma.maintenanceRequest.count({ where: { status: { in: ["OPEN","IN_PROGRESS"] } } }),
    prisma.expense.count({ where: { status: "PENDING" } }),
    getTotalIncomeIncludingBookingRevenue(),
    prisma.expense.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true } }),
  ]);

  const net = incomeTotals.totalIncome - Number(expenseTotal._sum.amount ?? 0);

  const recentBookings = await prisma.booking.findMany({
    include: { facility: { select: { name: true } }, patron: { select: { name: true } }, user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const recentBookingsWithFacility = recentBookings.filter((b) => b.facility !== null) as Parameters<typeof RecentBookings>[0]["bookings"];
  const isFM = ["FACILITY_MANAGER","SUPER_ADMIN"].includes(session.role);
  const canBook = ["FACILITY_MANAGER","BOOKING_MANAGER","SUPER_ADMIN"].includes(session.role);

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none -z-0"
        style={{ background: "radial-gradient(circle, rgba(200,163,90,0.07) 0%, transparent 70%)", filter: "blur(40px)" }}
      />

      {/* Hero header */}
      <div className="card relative z-10 overflow-hidden"
        style={{
          padding: "24px 28px",
          background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
          borderColor: "rgba(200,163,90,0.3)",
        }}
      >
        {/* Gold shimmer line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(200,163,90,0.5), transparent)" }} />
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.08em] font-bold mb-2" style={{ color: "rgba(255,255,255,0.55)" }}>
            Welcome Back
          </p>
          <h1 className="text-[clamp(1.75rem,2.5vw,2.5rem)] font-bold leading-[1.1] mb-1.5" style={{ fontFamily: "var(--font-display)", color: "#fff" }}>
            {session.name.split(" ")[0]}&apos;s Dashboard
          </h1>
          <p className="text-[0.95rem]" style={{ color: "rgba(255,255,255,0.7)" }}>
            Manage facilities, bookings, and operations efficiently
          </p>
        </div>
      </div>

      {/* Quick actions */}
      {canBook && (
        <div className="relative z-10 flex flex-wrap gap-2">
          <Link href="/bookings/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: "var(--navy)", color: "var(--gold)", border: "1px solid rgba(200,163,90,0.3)" }}>
            <Plus size={15} /> New Booking
          </Link>
          {pendingBookings > 0 && (
            <Link href="/bookings?status=PENDING" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ background: "rgba(200,163,90,0.1)", color: "var(--gold-muted)", border: "1px solid rgba(200,163,90,0.25)" }}>
              <ClipboardList size={15} /> Review {pendingBookings} Pending
            </Link>
          )}
          <Link href="/inventory" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--slate)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: "var(--white)", border: "1px solid var(--border)" }}>
            <Package size={15} /> Inventory
          </Link>
          {isFM && (
            <Link href="/reports" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--slate)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ background: "var(--white)", border: "1px solid var(--border)" }}>
              <BarChart3 size={15} /> Reports
            </Link>
          )}
        </div>
      )}

      {/* Primary stats */}
      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Facilities"  value={totalFacilities} icon={<Building2  size={16} />} href="/facilities" />
        <StatCard label="Pending Bookings"   value={pendingBookings}  icon={<CalendarDays size={16} />} sub={pendingBookings > 0 ? `${pendingBookings} awaiting approval` : "All clear"} trend={pendingBookings > 0 ? "down" : "neutral"} href="/bookings?status=PENDING" />
        <StatCard label="Active Bookings"    value={activeBookings}   icon={<CalendarDays size={16} />} sub="Approved & upcoming" trend="up" href="/bookings?status=APPROVED" />
        <StatCard label="Open Maintenance"   value={openMaintenance}  icon={<Wrench size={16} />} sub={openMaintenance > 0 ? "Requires attention" : "All resolved"} trend={openMaintenance > 0 ? "down" : "neutral"} href="/maintenance?status=OPEN" />
      </div>

      {/* Financial stats — FM only */}
      {isFM && (
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total Income"   value={formatCurrency(incomeTotals.totalIncome)}  icon={<TrendingUp size={16} />} trend="up" href="/transactions?tab=income" />
          <StatCard label="Total Expenses" value={formatCurrency(Number(expenseTotal._sum.amount ?? 0))} icon={<TrendingDown size={16} />} href="/transactions?tab=expenses" />
          <StatCard label="Net Balance"    value={formatCurrency(net)} icon={<DollarSign size={16} />} sub={net >= 0 ? "Surplus" : "Deficit"} trend={net >= 0 ? "up" : "down"} href="/transactions?tab=overview" />
        </div>
      )}

      {/* Pending alert */}
      {(pendingBookings > 0 || pendingExpenses > 0) && (
        <div className="relative z-10 flex items-center gap-3 rounded-xl border px-5 py-4"
          style={{
            background: "linear-gradient(135deg, rgba(200,163,90,0.08) 0%, rgba(200,163,90,0.03) 100%)",
            borderColor: "rgba(200,163,90,0.28)",
          }}
        >
          <span className="w-2 h-2 rounded-full bg-[var(--gold)] flex-shrink-0 animate-pulse" />
          <p className="text-[0.9rem] text-[var(--navy)] font-medium">
            {pendingBookings > 0 && <span><strong>{pendingBookings} booking{pendingBookings !== 1 ? "s" : ""}</strong> awaiting approval. </span>}
            {pendingExpenses > 0 && <span><strong>{pendingExpenses} expense{pendingExpenses !== 1 ? "s" : ""}</strong> pending review.</span>}
          </p>
        </div>
      )}

      {/* Recent bookings */}
      <div className="relative z-10">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.08em] font-bold text-[var(--muted)] mb-1">Latest Activity</p>
            <h2 className="text-[1.5rem] font-bold text-[var(--navy)] leading-tight" style={{ fontFamily: "var(--font-display)" }}>
              Recent Bookings
            </h2>
          </div>
          <Link href="/bookings" className="text-[0.88rem] font-semibold text-[var(--gold)] hover:text-[var(--gold-bright)] transition-colors flex items-center gap-1">
            View All →
          </Link>
        </div>
        <div className="card overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #FFFFFF 0%, #FEFDFB 100%)",
            boxShadow: "0 2px 8px rgba(10,22,40,0.04), 0 1px 3px rgba(10,22,40,0.06)"
          }}
        >
          <RecentBookings bookings={recentBookingsWithFacility} />
        </div>
      </div>
    </div>
  );
}
