import Link from "next/link";
import { Package, Tag, ArrowRightLeft, Wrench, AlertTriangle, CheckCircle, Clock, Plus } from "lucide-react";
import { requirePerm } from "@/lib/auth/guards";
import { getInventorySummary, getInventoryItems, getActiveCheckouts, getInventoryMaintenanceLogs } from "@/actions/inventory.actions";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { buttonVariants } from "@/components/ui/button-variants";

import { Card } from "@/components/ui/card";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 }).format(n);
}

export default async function InventoryPage() {
  const session = await requirePerm("inventory:view");
  const canManage = session.role === "SUPER_ADMIN" || (session.authContext?.permissions["inventory:manage"] ?? false);

  const [summary, { items }, { checkouts }, { logs }] = await Promise.all([
    getInventorySummary(),
    getInventoryItems({ page: 1 }),
    getActiveCheckouts({ page: 1 }),
    getInventoryMaintenanceLogs({ page: 1 }),
  ]);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <PageHeader
        title="Inventory"
        description="Equipment and supplies on campus: where they are, who has them, and what needs repair."
        meta={<>{summary.totalItems} item{summary.totalItems !== 1 ? "s" : ""} tracked · est. value {formatCurrency(summary.totalEstimatedValue)}</>}
        className="mb-0"
        actions={
          canManage ? (
            <>
              <Link href="/inventory/categories" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}><Tag size={15} /> Categories</Link>
              <Link href="/inventory/items/new" className={cn(buttonVariants({ variant: "default" }), "gap-2")}><Plus size={15} /> Add item</Link>
            </>
          ) : undefined
        }
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Items"             value={summary.totalItems}            color="inventory"   icon={<Package size={16} />} href="/inventory/items" sub="Tracked on campus" />
        <StatCard label="Available"         value={summary.availableItems}        color="success"     icon={<CheckCircle size={16} />} href="/inventory/items" sub="Ready to check out" />
        <StatCard label="Checked out"       value={summary.checkedOutItems}       color="warning"     icon={<ArrowRightLeft size={16} />} href="/inventory/checkouts" sub="With staff now" />
        <StatCard label="Overdue returns"   value={summary.overdueCheckouts}      color="danger"      icon={<AlertTriangle size={16} />} href="/inventory/checkouts" sub="Past their due date" trend={summary.overdueCheckouts > 0 ? "down" : undefined} />
        <StatCard label="In maintenance"    value={summary.underMaintenanceItems} color="maintenance" icon={<Wrench size={16} />} href="/inventory/maintenance" sub="Out of service" />
        <StatCard label="Open repairs"      value={summary.openMaintenanceLogs}   color="maintenance" icon={<Clock size={16} />} href="/inventory/maintenance" sub="Logs not closed" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Quick nav */}
        <Card className="p-5 px-6">
          <h2 className="text-base font-medium text-[var(--navy)] mb-4">Quick access</h2>
          <div className="flex flex-col gap-2.5">
            {[
              { href: "/inventory/items",       icon: Package,        label: "All items",              sub: `${summary.totalItems} tracked` },
              { href: "/inventory/checkouts",   icon: ArrowRightLeft, label: "Active checkouts",       sub: `${summary.checkedOutItems} out` },
              { href: "/inventory/maintenance", icon: Wrench,         label: "Maintenance logs",       sub: `${summary.openMaintenanceLogs} open` },
              { href: "/inventory/categories",  icon: Tag,            label: "Categories",             sub: "Manage types" },
            ].map(({ href, icon: Icon, label, sub }) => (
              <Link key={href} href={href} className="flex items-center gap-3 p-2.5 px-3 rounded-2xl border border-border/70 hover:bg-muted/60 transition-colors">
                <Icon size={18} className="text-[var(--navy)] shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[var(--navy)]">{label}</p>
                  <p className="text-[0.75rem] text-[var(--muted)]">{sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* Active checkouts */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex justify-between items-center">
            <h2 className="text-base font-medium text-[var(--navy)]">Active checkouts</h2>
            <Link href="/inventory/checkouts" className="text-[0.78rem] text-[var(--gold)] font-semibold hover:underline">View all →</Link>
          </div>
          {checkouts.length === 0 ? (
            <p className="p-5 px-5 text-[var(--muted)] text-sm">No active checkouts.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    {["Item", "Checked out by", "Due back"].map((h) => (
                      <th key={h} className="py-2.5 px-4 text-left text-xs tracking-[0.4px] text-[var(--muted)] whitespace-nowrap font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {checkouts.slice(0, 5).map((co) => {
                    const isOverdue = co.dueBack && new Date(co.dueBack) < new Date();
                    return (
                      <tr key={co.id} className="border-t border-border/60 hover:bg-muted/40">
                        <td className="py-2.5 px-4">
                          <p className="font-semibold text-[var(--navy)] text-[0.85rem]">{co.item.name}</p>
                          {co.item.assetTag && <p className="text-[0.72rem] text-[var(--muted)]">#{co.item.assetTag}</p>}
                        </td>
                        <td className="py-2.5 px-4 text-[var(--slate)] whitespace-nowrap">{co.checkedOutBy.name}</td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {co.dueBack ? (
                            <span className={`text-[0.8rem] font-semibold ${isOverdue ? "text-danger" : "text-[var(--slate)]"}`}>
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
        </Card>
      </div>

      {/* Recent items */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex justify-between items-center">
          <h2 className="text-base font-medium text-[var(--navy)]">Recent items</h2>
          <Link href="/inventory/items" className="text-[0.78rem] text-[var(--gold)] font-semibold hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                {["Item", "Category", "Location", "Qty", "Condition", "Status"].map((h) => (
                  <th key={h} className="py-2.5 px-4 text-left text-xs tracking-[0.4px] text-[var(--muted)] whitespace-nowrap font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 8).map((item) => (
                <tr key={item.id} className="border-t border-border/60 hover:bg-muted/40">
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
                    <ItemStatusBadge status={item.status} />
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
      </Card>
    </div>
  );
}

function ConditionBadge({ condition }: { condition: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    EXCELLENT:  { label: "Excellent",  classes: "bg-success/10 text-success border border-success/25" },
    GOOD:       { label: "Good",       classes: "bg-info/10 text-info border border-info/25" },
    FAIR:       { label: "Fair",       classes: "bg-warning/10 text-warning border border-warning/25" },
    POOR:       { label: "Poor",       classes: "bg-danger/10 text-danger border border-danger/25" },
    DAMAGED:    { label: "Damaged",    classes: "bg-danger/10 text-danger border border-danger/25" },
    DISPOSED:   { label: "Disposed",   classes: "bg-foreground/5 text-muted-foreground border border-foreground/10" },
  };
  const s = map[condition] ?? { label: condition, classes: "bg-foreground/5 text-muted-foreground border border-foreground/10" };
  return <span className={`text-[0.72rem] font-bold px-2 py-0.5 rounded-full ${s.classes}`}>{s.label}</span>;
}

function ItemStatusBadge({ status }: { status: string }) {
  if (status === "IN_USE") return <StatusBadge status="CHECKED_OUT" label="In Use" />;
  if (status === "LOST")   return <StatusBadge status="FAILED" label="Lost" />;
  return <StatusBadge status={status} />;
}
