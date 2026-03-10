import { requireStaff } from "@/lib/auth/guards";
import { getFinancialReport, getBookingReport, getOperationalReport } from "@/actions/reports.actions";
import { formatCurrency, statusBadgeClass, formatDateTime } from "@/lib/utils";
import RevenueChart from "@/components/reports/RevenueChart";
import ExpensePieChart from "@/components/reports/ExpensePieChart";

export default async function ReportsPage() {
  await requireStaff("FACILITY_MANAGER");

  const [financial, bookings, operational] = await Promise.all([
    getFinancialReport(6),
    getBookingReport(),
    getOperationalReport(),
  ]);

  const totalIncome  = financial.reduce((s, m) => s + m.income + m.bookingRevenue, 0);
  const totalExpense = financial.reduce((s, m) => s + m.expenses, 0);
  const netBalance   = totalIncome - totalExpense;

  const totalBookings = bookings.statusBreakdown.reduce((s, b) => s + (b._count?._all ?? 0), 0);
  const paidBookings  = bookings.statusBreakdown.find((b) => b.status === "APPROVED")?._count?._all ?? 0;

  return (
    <div className="space-y-8 animate-fade-in" style={{ position: "relative" }}>
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

      <div className="card" style={{
        padding: "24px 28px",
        background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
        borderColor: "rgba(200,163,90,0.3)",
        position: "relative",
        zIndex: 1
      }}>
        <div style={{
          position: "absolute",
          top: -40,
          right: -60,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "12px", color: "rgba(255,255,255,0.7)" }}>
            Analytics & Insights
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: "8px" }}>
            Reports
          </h1>
          <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.9)" }}>
            6-month financial and operational overview
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Income",    value: formatCurrency(totalIncome),   color: "text-green-700",  bg: "bg-green-50  border-green-200" },
          { label: "Total Expenses",  value: formatCurrency(totalExpense),  color: "text-red-700",    bg: "bg-red-50    border-red-200" },
          { label: "Net Balance",     value: formatCurrency(netBalance),    color: netBalance >= 0 ? "text-green-700" : "text-red-700", bg: netBalance >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200" },
          { label: "Total Bookings",  value: totalBookings,                 color: "text-[var(--navy)]",  bg: "bg-brand-50  border-brand-200" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`card p-5 border ${bg}`}>
            <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="card p-6">
        <h2 className="font-semibold text-[var(--navy)] mb-4">Monthly Financial Overview</h2>
        <RevenueChart data={financial} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense by category */}
        <div className="card p-6">
          <h2 className="font-semibold text-[var(--navy)] mb-4">Expenses by Category</h2>
          <ExpensePieChart data={operational.topExpenseCategories.map((c) => ({
            name: c.category,
            value: Number(c._sum.amount ?? 0),
            count: c._count?._all ?? 0,
          }))} />
        </div>

        {/* Booking by status */}
        <div className="card p-6">
          <h2 className="font-semibold text-[var(--navy)] mb-4">Bookings by Status</h2>
          <div className="space-y-2">
            {bookings.statusBreakdown.map((b) => (
              <div key={b.status} className="flex items-center gap-3">
                <span className={`${statusBadgeClass(b.status)} w-24 justify-center`}>{b.status}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-[var(--navy)] rounded-full"
                    style={{ width: `${totalBookings ? (((b._count?._all ?? 0) / totalBookings) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-[var(--slate)] w-6 text-right">{b._count?._all ?? 0}</span>
                <span className="text-xs text-[var(--muted)] w-24 text-right">{formatCurrency(Number(b._sum.totalAmount ?? 0))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top facilities */}
      <div className="card p-6">
        <h2 className="font-semibold text-[var(--navy)] mb-4">Top Facilities by Bookings</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 font-medium text-[var(--muted)]">Facility</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--muted)]">Bookings</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--muted)]">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {bookings.facilityBreakdown.map((f, i) => (
                <tr key={f.facilityId} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                  <td className="py-2.5 px-3 font-medium text-gray-800">
                    <span className="text-gray-300 mr-2">#{i + 1}</span>{f.facilityName}
                  </td>
                  <td className="py-2.5 px-3 text-right text-[var(--slate)]">{f._count?._all ?? 0}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-[var(--navy)]">
                    {formatCurrency(Number(f._sum.totalAmount ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maintenance summary */}
      <div className="card p-6">
        <h2 className="font-semibold text-[var(--navy)] mb-4">Maintenance Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((status) => {
            const count = operational.maintenanceSummary
              .filter((m) => m.status === status)
              .reduce((s, m) => s + (m._count?._all ?? 0), 0);
            return (
              <div key={status} className="bg-[var(--cream)] rounded-lg p-3 text-center border border-[var(--border)]">
                <p className="text-2xl font-bold text-gray-800">{count}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">{status.replace("_", " ")}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent payments */}
      <div className="card p-6">
        <h2 className="font-semibold text-[var(--navy)] mb-4">Recent Payments</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 font-medium text-[var(--muted)]">Patron</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted)]">Booking</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted)]">Provider</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--muted)]">Date</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--muted)]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bookings.recentPaid.map((p) => (
                <tr key={p.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                  <td className="py-2.5 px-3 font-medium text-gray-800">{p.patron?.name ?? "—"}</td>
                  <td className="py-2.5 px-3 text-[var(--slate)]">{p.booking.title}</td>
                  <td className="py-2.5 px-3 text-[var(--muted)]">{p.provider}</td>
                  <td className="py-2.5 px-3 text-[var(--muted)]">{p.paidAt ? formatDateTime(p.paidAt) : "—"}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-green-700">
                    {formatCurrency(Number(p.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
