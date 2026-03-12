import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";
import StatCard from "@/components/ui/StatCard";
import RecentBookings from "@/components/bookings/RecentBookings";
import { Building2, CalendarDays, Wrench, Receipt, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export default async function DashboardPage() {
  const session = await requireStaff();

  const [
    totalFacilities, pendingBookings, activeBookings, openMaintenance,
    pendingExpenses, incomeTotal, expenseTotal,
  ] = await Promise.all([
    prisma.facility.count({ where: { isActive: true } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { status: "APPROVED" } }),
    prisma.maintenanceRequest.count({ where: { status: { in: ["OPEN","IN_PROGRESS"] } } }),
    prisma.expense.count({ where: { status: "PENDING" } }),
    prisma.income.aggregate({ _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true } }),
  ]);

  const net = Number(incomeTotal._sum.amount ?? 0) - Number(expenseTotal._sum.amount ?? 0);

  const recentBookings = await prisma.booking.findMany({
    include: { facility: { select: { name: true } }, patron: { select: { name: true } }, user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  
    // Filter out bookings without facilities for RecentBookings component type safety
    const recentBookingsWithFacility = recentBookings.filter((b) => b.facility !== null) as Parameters<typeof RecentBookings>[0]["bookings"];

  const isFM = ["FACILITY_MANAGER","SUPER_ADMIN"].includes(session.role);

  return (
    <div className="space-y-8 animate-fade-in" style={{ position: "relative" }}>
      {/* Ambient background effects */}
      <div style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: 500,
        height: 500,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
        filter: "blur(40px)"
      }} />

      <div className="card" style={{
        padding: "24px 28px",
        background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
        borderColor: "rgba(200,163,90,0.3)",
        position: "relative",
        zIndex: 1
      }}>
        <div>
          <p style={{
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.6)",
            marginBottom: 8,
            fontWeight: 700
          }}>
            Welcome Back
          </p>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem, 2.5vw, 2.5rem)",
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1.1,
            marginBottom: 6
          }}>
            {session.name.split(" ")[0]}&apos;s Dashboard
          </h1>
          <p style={{
            fontSize: "0.95rem",
            color: "rgba(255,255,255,0.75)"
          }}>
            Manage facilities, bookings, and operations efficiently
          </p>
        </div>
      </div>

      {/* Primary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, position: "relative", zIndex: 1 }}>
        <StatCard label="Active Facilities"  value={totalFacilities} icon={<Building2  size={16} />} />
        <StatCard label="Pending Bookings"   value={pendingBookings}  icon={<CalendarDays size={16} />} sub={pendingBookings > 0 ? `${pendingBookings} awaiting approval` : "All clear"} trend={pendingBookings > 0 ? "down" : "neutral"} />
        <StatCard label="Active Bookings"    value={activeBookings}   icon={<CalendarDays size={16} />} sub="Approved & upcoming" trend="up" />
        <StatCard label="Open Maintenance"   value={openMaintenance}  icon={<Wrench size={16} />} sub={openMaintenance > 0 ? "Requires attention" : "All resolved"} trend={openMaintenance > 0 ? "down" : "neutral"} />
      </div>

      {/* Financial stats — FM only */}
      {isFM && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total Income"   value={formatCurrency(Number(incomeTotal._sum.amount ?? 0))}  icon={<TrendingUp size={16} />} trend="up" />
          <StatCard label="Total Expenses" value={formatCurrency(Number(expenseTotal._sum.amount ?? 0))} icon={<TrendingDown size={16} />} />
          <StatCard label="Net Balance"    value={formatCurrency(net)} icon={<DollarSign size={16} />} sub={net >= 0 ? "Surplus" : "Deficit"} trend={net >= 0 ? "up" : "down"} />
        </div>
      )}

      {/* Pending alert */}
      {(pendingBookings > 0 || pendingExpenses > 0) && (
        <div style={{ 
          background: "linear-gradient(135deg, rgba(200,163,90,0.1) 0%, rgba(200,163,90,0.05) 100%)",
          border: "1px solid rgba(200,163,90,0.3)", 
          borderRadius: "12px", 
          padding: "16px 20px", 
          display: "flex", 
          alignItems: "center", 
          gap: 12 
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)", flexShrink: 0, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
          <p style={{ fontSize: "0.9rem", color: "var(--navy)", fontWeight: 500 }}>
            {pendingBookings > 0 && <span><strong>{pendingBookings} booking{pendingBookings !== 1 ? "s" : ""}</strong> awaiting approval. </span>}
            {pendingExpenses > 0 && <span><strong>{pendingExpenses} expense{pendingExpenses !== 1 ? "s" : ""}</strong> pending review.</span>}
          </p>
        </div>
      )}

      {/* Recent bookings */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <p style={{ 
              fontSize: "0.7rem", 
              textTransform: "uppercase", 
              letterSpacing: "0.08em", 
              color: "var(--muted)",
              fontWeight: 700,
              marginBottom: 4
            }}>
              Latest Activity
            </p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--navy)", lineHeight: 1.2 }}>
              Recent Bookings
            </h2>
          </div>
          <a href="/bookings" style={{ 
            fontSize: "0.9rem", 
            color: "var(--gold)", 
            textDecoration: "none", 
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "all 0.2s"
          }}>
            View All →
          </a>
        </div>
        <div className="card overflow-hidden" style={{
          background: "linear-gradient(135deg, #FFFFFF 0%, #FEFDFB 100%)",
          boxShadow: "0 2px 8px rgba(10,22,40,0.04), 0 1px 3px rgba(10,22,40,0.06)"
        }}>
            <RecentBookings bookings={recentBookingsWithFacility} />
        </div>
      </div>
    </div>
  );
}
