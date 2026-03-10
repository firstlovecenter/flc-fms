import Link from "next/link";
import { Package, Tag, ArrowRightLeft, Wrench, AlertTriangle, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { getInventorySummary, getInventoryItems, getActiveCheckouts, getInventoryMaintenanceLogs } from "@/actions/inventory.actions";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 }).format(n);
}

export default async function InventoryPage() {
  const session = await requireStaff();
  const canManage = ["FACILITY_MANAGER", "SUPER_ADMIN"].includes(session.role);

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
    <div className="space-y-6 animate-fade-in" style={{ position: "relative" }}>
      {/* Decorative bg */}
      <div style={{ position: "fixed", top: 80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,163,90,0.07) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Header */}
      <div className="card" style={{ padding: "24px 28px", background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)", borderColor: "rgba(200,163,90,0.3)", position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8, color: "rgba(255,255,255,0.6)" }}>Campus Management</p>
          <h1 style={{ fontSize: "clamp(1.6rem, 2.4vw, 2.2rem)", fontWeight: 700, fontFamily: "var(--font-display)", color: "#fff", marginBottom: 6 }}>Inventory</h1>
          <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}>
            {summary.totalItems} item{summary.totalItems !== 1 ? "s" : ""} tracked &bull; Est. value {formatCurrency(summary.totalEstimatedValue)}
          </p>
        </div>
        {canManage && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/inventory/items/new" className="btn-gold" style={{ fontSize: "0.85rem" }}>+ Add Item</Link>
            <Link href="/inventory/categories" className="btn-secondary" style={{ fontSize: "0.85rem", color: "#fff", borderColor: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)" }}>Categories</Link>
          </div>
        )}
      </div>

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, position: "relative", zIndex: 1 }}>
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon size={16} style={{ color }} />
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 600 }}>{label}</span>
            </div>
            <span style={{ fontSize: "1.7rem", fontWeight: 700, color, fontFamily: "var(--font-display)", lineHeight: 1 }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, position: "relative", zIndex: 1 }}>
        {/* Quick nav */}
        <div className="card" style={{ padding: "20px 24px" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--navy)", marginBottom: 16 }}>Quick Access</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { href: "/inventory/items",       icon: Package,        label: "All Items",              sub: `${summary.totalItems} tracked` },
              { href: "/inventory/checkouts",   icon: ArrowRightLeft, label: "Active Checkouts",       sub: `${summary.checkedOutItems} out` },
              { href: "/inventory/maintenance", icon: Wrench,         label: "Maintenance Logs",       sub: `${summary.openMaintenanceLogs} open` },
              { href: "/inventory/categories",  icon: Tag,            label: "Categories",             sub: "Manage types" },
            ].map(({ href, icon: Icon, label, sub }) => (
              <Link key={href} href={href} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", textDecoration: "none", transition: "background 0.15s" }} className="hover:bg-[var(--cream)]">
                <Icon size={18} style={{ color: "var(--navy)", flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--navy)" }}>{label}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Active checkouts */}
        <div className="card overflow-hidden" style={{ padding: 0 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--navy)" }}>Active Checkouts</h2>
            <Link href="/inventory/checkouts" style={{ fontSize: "0.78rem", color: "var(--gold)", fontWeight: 600, textDecoration: "none" }}>View all →</Link>
          </div>
          {checkouts.length === 0 ? (
            <p style={{ padding: "24px 20px", color: "var(--muted)", fontSize: "0.875rem" }}>No active checkouts.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="w-full text-sm">
                <thead style={{ background: "linear-gradient(135deg, rgba(10,22,40,0.03) 0%, rgba(10,22,40,0.06) 100%)", borderBottom: "1px solid var(--border)" }}>
                  <tr>
                    {["Item", "Checked Out By", "Due Back"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: "var(--navy)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {checkouts.slice(0, 5).map((co) => {
                    const isOverdue = co.dueBack && new Date(co.dueBack) < new Date();
                    return (
                      <tr key={co.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-[var(--cream)]">
                        <td style={{ padding: "10px 16px" }}>
                          <p style={{ fontWeight: 600, color: "var(--navy)", fontSize: "0.85rem" }}>{co.item.name}</p>
                          {co.item.assetTag && <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>#{co.item.assetTag}</p>}
                        </td>
                        <td style={{ padding: "10px 16px", color: "var(--slate)", whiteSpace: "nowrap" }}>{co.checkedOutBy.name}</td>
                        <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                          {co.dueBack ? (
                            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: isOverdue ? "#dc2626" : "var(--slate)" }}>
                              {isOverdue ? "⚠ " : ""}{new Date(co.dueBack).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                          ) : (
                            <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>—</span>
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
      <div className="card overflow-hidden" style={{ position: "relative", zIndex: 1 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--navy)" }}>Recent Items</h2>
          <Link href="/inventory/items" style={{ fontSize: "0.78rem", color: "var(--gold)", fontWeight: 600, textDecoration: "none" }}>View all →</Link>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "linear-gradient(135deg, rgba(10,22,40,0.03) 0%, rgba(10,22,40,0.06) 100%)", borderBottom: "1px solid var(--border)" }}>
              <tr>
                {["Item", "Category", "Location", "Qty", "Condition", "Status"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: "var(--navy)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 8).map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-[var(--cream)]">
                  <td style={{ padding: "10px 16px" }}>
                    <Link href={`/inventory/items/${item.id}`} style={{ textDecoration: "none" }}>
                      <p style={{ fontWeight: 600, color: "var(--navy)", fontSize: "0.875rem" }}>{item.name}</p>
                      {item.assetTag && <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>#{item.assetTag}</p>}
                    </Link>
                  </td>
                  <td style={{ padding: "10px 16px", color: "var(--slate)", fontSize: "0.85rem" }}>{item.category?.name ?? "—"}</td>
                  <td style={{ padding: "10px 16px", color: "var(--slate)", fontSize: "0.85rem" }}>{item.location ?? "—"}</td>
                  <td style={{ padding: "10px 16px", color: "var(--slate)", fontSize: "0.85rem", textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <ConditionBadge condition={item.condition} />
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)" }}>
                    No inventory items yet. <Link href="/inventory/items/new" style={{ color: "var(--gold)", fontWeight: 600 }}>Add the first item →</Link>
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
  return <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, backgroundColor: s.bg, color: s.color }}>{s.label}</span>;
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
  return <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, backgroundColor: s.bg, color: s.color }}>{s.label}</span>;
}
