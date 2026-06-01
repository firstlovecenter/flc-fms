import Link from "next/link";
import { Package, Tag, ArrowRightLeft, Wrench, AlertTriangle, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { getInventorySummary, getInventoryItems, getActiveCheckouts, getInventoryMaintenanceLogs } from "@/actions/inventory.actions";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 }).format(n);
}

export default async function InventoryPage() {
  const session = await requireStaff();
  const canManage = ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"].includes(session.role);

  const [summary, { items }, { checkouts }, { logs }] = await Promise.all([
    getInventorySummary(),
    getInventoryItems({ page: 1 }),
    getActiveCheckouts({ page: 1 }),
    getInventoryMaintenanceLogs({ page: 1 }),
  ]);

  const statCards = [
    { label: "Total Items",          value: summary.totalItems,             icon: Package,      color: "var(--navy)"  },
    { label: "Available",            value: summary.availableItems,         icon: CheckCircle,  color: "#16a34a"      },
    { label: "Checked Out",          value: summary.checkedOutItems,        icon: ArrowRightLeft, color: "#d97706"    },
    { label: "Under Maintenance",    value: summary.underMaintenanceItems,  icon: Wrench,       color: "#9333ea"      },
    { label: "Overdue Returns",      value: summary.overdueCheckouts,       icon: AlertTriangle, color: "#dc2626"     },
    { label: "Open Maintenance",     value: summary.openMaintenanceLogs,    icon: Clock,        color: "#ea580c"      },
  ];

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Decorative bg */}
      <div className="fixed top-[80px] right-[-80px] w-[320px] h-[320px] rounded-full pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(200,163,90,0.07) 0%, transparent 70%)" }} />

      {/* Header */}
      <div className="page-hero flex items-start justify-between gap-4 flex-wrap relative z-10">
        <div>
          <p className="section-eyebrow mb-3">Campus Management</p>
          <h1 className="page-title text-[2rem] mb-2">Inventory</h1>
          <p className="page-hero-muted text-[0.95rem]">
            {summary.totalItems} item{summary.totalItems !== 1 ? "s" : ""} tracked &bull; Est. value {formatCurrency(summary.totalEstimatedValue)}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2 flex-wrap mt-3">
            <Link href="/inventory/items/new" className="btn-gold flex items-center gap-2">+ Add Item</Link>
            <Link href="/inventory/categories" className="btn-secondary flex items-center gap-2">Categories</Link>
          </div>
        )}
      </div>

      {/* Summary tiles */}
      <div className="grid gap-4 relative z-10 stagger-children" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Icon size={16} style={{ color }} />
              <span className="text-[0.75rem] text-[var(--muted)] font-semibold">{label}</span>
            </div>
            <span className="text-[1.7rem] font-bold leading-none" style={{ color, fontFamily: "var(--font-display)" }}>{value}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-5 relative z-10" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {/* Quick nav */}
        <div className="card p-5 px-6">
          <h2 className="text-base font-bold text-[var(--navy)] mb-4">Quick Access</h2>
          <div className="flex flex-col gap-2.5">
            {[
              { href: "/inventory/items",       icon: Package,        label: "All Items",              sub: `${summary.totalItems} tracked` },
              { href: "/inventory/checkouts",   icon: ArrowRightLeft, label: "Active Checkouts",       sub: `${summary.checkedOutItems} out` },
              { href: "/inventory/maintenance", icon: Wrench,         label: "Maintenance Logs",       sub: `${summary.openMaintenanceLogs} open` },
              { href: "/inventory/categories",  icon: Tag,            label: "Categories",             sub: "Manage types" },
            ].map(({ href, icon: Icon, label, sub }) => (
              <Link key={href} href={href} className="flex items-center gap-3 p-2.5 px-3 rounded-lg border border-[var(--border)] hover:bg-[var(--cream)] transition-colors">
                <Icon size={18} className="text-[var(--navy)] shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[var(--navy)]">{label}</p>
                  <p className="text-[0.75rem] text-[var(--muted)]">{sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Active checkouts */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex justify-between items-center">
            <h2 className="text-base font-bold text-[var(--navy)]">Active Checkouts</h2>
            <Link href="/inventory/checkouts" className="text-[0.78rem] text-[var(--gold)] font-semibold hover:underline">View all →</Link>
          </div>
          {checkouts.length === 0 ? (
            <p className="p-5 px-5 text-[var(--muted)] text-sm">No active checkouts.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--cream)] border-b border-[var(--border)]">
                  <tr>
                    {["Item", "Checked Out By", "Due Back"].map((h) => (
                      <th key={h} className="py-2.5 px-4 text-left text-[0.72rem] font-bold uppercase tracking-[0.4px] text-[var(--navy)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {checkouts.slice(0, 5).map((co) => {
                    const isOverdue = co.dueBack && new Date(co.dueBack) < new Date();
                    return (
                      <tr key={co.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                        <td className="py-2.5 px-4">
                          <p className="font-semibold text-[var(--navy)] text-[0.85rem]">{co.item.name}</p>
                          {co.item.assetTag && <p className="text-[0.72rem] text-[var(--muted)]">#{co.item.assetTag}</p>}
                        </td>
                        <td className="py-2.5 px-4 text-[var(--slate)] whitespace-nowrap">{co.checkedOutBy.name}</td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {co.dueBack ? (
                            <span className={`text-[0.8rem] font-semibold ${isOverdue ? "text-red-600" : "text-[var(--slate)]"}`}>
                              {isOverdue ? "⚠ " : ""}{new Date(co.dueBack).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                          ) : (
                            <span className="text-[var(--muted)] text-[0.8rem]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent items */}
      <div className="card overflow-hidden relative z-10">
        <div className="px-5 py-4 border-b border-[var(--border)] flex justify-between items-center">
          <h2 className="text-base font-bold text-[var(--navy)]">Recent Items</h2>
          <Link href="/inventory/items" className="text-[0.78rem] text-[var(--gold)] font-semibold hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--cream)] border-b border-[var(--border)]">
              <tr>
                {["Item", "Category", "Location", "Qty", "Condition", "Status"].map((h) => (
                  <th key={h} className="py-2.5 px-4 text-left text-[0.72rem] font-bold uppercase tracking-[0.4px] text-[var(--navy)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 8).map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                  <td className="py-2.5 px-4">
                    <Link href={`/inventory/items/${item.id}`} className="no-underline">
                      <p className="font-semibold text-[var(--navy)] text-[0.875rem]">{item.name}</p>
                      {item.assetTag && <p className="text-[0.72rem] text-[var(--muted)]">#{item.assetTag}</p>}
                    </Link>
                  </td>
                  <td className="py-2.5 px-4 text-[var(--slate)] text-[0.85rem]">{item.category?.name ?? "—"}</td>
                  <td className="py-2.5 px-4 text-[var(--slate)] text-[0.85rem]">{item.location ?? "—"}</td>
                  <td className="py-2.5 px-4 text-[var(--slate)] text-[0.85rem] text-center">{item.quantity}</td>
                  <td className="py-2.5 px-4">
                    <ConditionBadge condition={item.condition} />
                  </td>
                  <td className="py-2.5 px-4">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-[var(--muted)]">
                    No inventory items yet. <Link href="/inventory/items/new" className="text-[var(--gold)] font-semibold">Add the first item →</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ConditionBadge({ condition }: { condition: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    EXCELLENT:  { label: "Excellent",  bg: "#dcfce7", color: "#15803d" },
    GOOD:       { label: "Good",       bg: "#dbeafe", color: "#1d4ed8" },
    FAIR:       { label: "Fair",       bg: "#fef9c3", color: "#854d0e" },
    POOR:       { label: "Poor",       bg: "#fee2e2", color: "#dc2626" },
    DAMAGED:    { label: "Damaged",    bg: "#fce7f3", color: "#9d174d" },
    DISPOSED:   { label: "Disposed",   bg: "#f1f5f9", color: "#64748b" },
  };
  const s = map[condition] ?? { label: condition, bg: "#f1f5f9", color: "#64748b" };
  return <span className="text-[0.72rem] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>{s.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    AVAILABLE:         { label: "Available",      bg: "#dcfce7", color: "#15803d" },
    IN_USE:            { label: "In Use",         bg: "#dbeafe", color: "#1d4ed8" },
    CHECKED_OUT:       { label: "Checked Out",    bg: "#fef9c3", color: "#854d0e" },
    UNDER_MAINTENANCE: { label: "Maintenance",    bg: "#fce7f3", color: "#9d174d" },
    DISPOSED:          { label: "Disposed",       bg: "#f1f5f9", color: "#64748b" },
    LOST:              { label: "Lost",           bg: "#fee2e2", color: "#dc2626" },
  };
  const s = map[status] ?? { label: status, bg: "#f1f5f9", color: "#64748b" };
  return <span className="text-[0.72rem] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>{s.label}</span>;
}
