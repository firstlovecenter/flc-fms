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
  PiggyBank,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await requireStaff();
  const isFM = ["FACILITY_MANAGER","SUPER_ADMIN"].includes(session.role);

  const [
    totalFacilities, pendingBookings, activeBookings, openMaintenance,
    pendingExpenses, incomeTotals, expenseTotal, savingsAgg,
  ] = await Promise.all([
    prisma.facility.count({ where: { isActive: true } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { status: "APPROVED" } }),
    prisma.maintenanceRequest.count({ where: { status: { in: ["OPEN","IN_PROGRESS"] } } }),
    prisma.expense.count({ where: { status: "PENDING" } }),
    getTotalIncomeIncludingBookingRevenue(),
    prisma.expense.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true } }),
    isFM
      ? prisma.savingsTransaction.groupBy({ by: ["type"], _sum: { amount: true } })
      : Promise.resolve([] as { type: string; _sum: { amount: unknown } }[]),
  ]);

  const totalApprovedExpenses = Number(expenseTotal._sum.amount ?? 0);
  const savingsDeposits    = Number((savingsAgg as { type: string; _sum: { amount: unknown } }[]).find((r) => r.type === "DEPOSIT")?._sum.amount    ?? 0);
  const savingsWithdrawals = Number((savingsAgg as { type: string; _sum: { amount: unknown } }[]).find((r) => r.type === "WITHDRAWAL")?._sum.amount ?? 0);
  const netSavings         = savingsDeposits - savingsWithdrawals;
  const net                = incomeTotals.totalIncome - totalApprovedExpenses;
  const availableBalance   = incomeTotals.totalIncome - totalApprovedExpenses - netSavings;

  const recentBookings = await prisma.booking.findMany({
    include: { facility: { select: { name: true } }, patron: { select: { name: true } }, user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const recentBookingsWithFacility = recentBookings.filter((b) => b.facility !== null) as Parameters<typeof RecentBookings>[0]["bookings"];
  const canBook = ["FACILITY_MANAGER","BOOKING_MANAGER","SUPER_ADMIN"].includes(session.role);

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Ambient glow */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none -z-0"
        style={{ background: "radial-gradient(circle, rgba(200,163,90,0.07) 0%, transparent 70%)", filter: "blur(40px)" }}
      />

      {/* Hero header */}
      <div className="page-hero relative z-10">
        {/* Gold shimmer line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(200,163,90,0.5), transparent)" }} />
        <div>
          <p className="section-eyebrow mb-2">Welcome Back</p>
          <h1 className="text-[clamp(1.75rem,2.5vw,2.5rem)] font-bold leading-[1.1] mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
            {session.name.split(" ")[0]}&apos;s Dashboard
          </h1>
          <p className="page-hero-muted text-[0.95rem]">
            Manage facilities, bookings, and operations efficiently
          </p>
        </div>
      </div>

      {/* Quick actions */}
      {canBook && (
        <div className="relative z-10 flex flex-wrap gap-2">
          <Link href="/bookings/new" className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm">
            <Plus size={15} /> New Booking
          </Link>
          {pendingBookings > 0 && (
            <Link href="/bookings?status=PENDING" className="btn-gold inline-flex items-center gap-2 px-4 py-2 text-sm">
              <ClipboardList size={15} /> Review {pendingBookings} Pending
            </Link>
          )}
          <Link href="/inventory" className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm">
            <Package size={15} /> Inventory
          </Link>
          {isFM && (
            <Link href="/reports" className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm">
              <BarChart3 size={15} /> Reports
            </Link>
          )}
        </div>
      )}

      {/* Primary stats */}
      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <StatCard label="Active Facilities"  value={totalFacilities} icon={<Building2  size={16} />} href="/facilities" />
        <StatCard label="Pending Bookings"   value={pendingBookings}  icon={<CalendarDays size={16} />} sub={pendingBookings > 0 ? `${pendingBookings} awaiting approval` : "All clear"} trend={pendingBookings > 0 ? "down" : "neutral"} href="/bookings?status=PENDING" />
        <StatCard label="Active Bookings"    value={activeBookings}   icon={<CalendarDays size={16} />} sub="Approved & upcoming" trend="up" href="/bookings?status=APPROVED" />
        <StatCard label="Open Maintenance"   value={openMaintenance}  icon={<Wrench size={16} />} sub={openMaintenance > 0 ? "Requires attention" : "All resolved"} trend={openMaintenance > 0 ? "down" : "neutral"} href="/maintenance?status=OPEN" />
      </div>

      {/* Financial stats — FM only */}
      {isFM && (
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
          <StatCard label="Total Income"      value={formatCurrency(incomeTotals.totalIncome)} icon={<TrendingUp size={16} />} trend="up" href="/transactions?tab=income" color="green" />
          <StatCard label="Total Expenses"    value={formatCurrency(totalApprovedExpenses)} icon={<TrendingDown size={16} />} href="/transactions?tab=expenses" color="red" />
          <StatCard label="Net Balance"       value={formatCurrency(net)} icon={<DollarSign size={16} />} sub={net >= 0 ? "Surplus" : "Deficit"} trend={net >= 0 ? "up" : "down"} href="/transactions?tab=overview" />
          <StatCard label="Savings Balance"   value={formatCurrency(netSavings)} icon={<PiggyBank size={16} />} href="/transactions?tab=savings" color="blue" />
          <StatCard label="Available Balance" value={formatCurrency(availableBalance)} icon={<DollarSign size={16} />} sub={availableBalance >= 0 ? "Surplus" : "Deficit"} trend={availableBalance >= 0 ? "up" : "down"} href="/transactions?tab=overview" />
        </div>
      )}

      {/* Pending alert */}
      {(pendingBookings > 0 || pendingExpenses > 0) && (
        <div className="relative z-10 alert alert-warn">
          <span className="w-2 h-2 rounded-full bg-[var(--gold)] flex-shrink-0 animate-pulse mt-0.5" />
          <p className="text-[0.9rem]">
            {pendingBookings > 0 && <span><strong>{pendingBookings} booking{pendingBookings !== 1 ? "s" : ""}</strong> awaiting approval. </span>}
            {pendingExpenses > 0 && <span><strong>{pendingExpenses} expense{pendingExpenses !== 1 ? "s" : ""}</strong> pending review.</span>}
          </p>
        </div>
      )}

      {/* Recent bookings */}
      <div className="relative z-10">
        <div className="page-header mb-4">
          <div>
            <p className="section-eyebrow mb-1">Latest Activity</p>
            <h2 className="page-title">Recent Bookings</h2>
          </div>
          <Link href="/bookings" className="link-gold inline-flex items-center gap-1 text-[0.88rem]">
            View All →
          </Link>
        </div>
        <div className="card overflow-hidden">
          <RecentBookings bookings={recentBookingsWithFacility} />
        </div>
      </div>
    </div>
  );
}
