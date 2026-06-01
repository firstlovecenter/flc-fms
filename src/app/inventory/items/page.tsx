import Link from "next/link";
import { requireStaff } from "@/lib/auth/guards";
import { getInventoryItems, getInventoryCategories } from "@/actions/inventory.actions";
import type { InventoryStatus } from "@prisma/client";

function ConditionBadge({ condition }: { condition: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    EXCELLENT: { label: "Excellent", bg: "#dcfce7", color: "#15803d" },
    GOOD:      { label: "Good",      bg: "#dbeafe", color: "#1d4ed8" },
    FAIR:      { label: "Fair",      bg: "#fef9c3", color: "#854d0e" },
    POOR:      { label: "Poor",      bg: "#fee2e2", color: "#dc2626" },
    DAMAGED:   { label: "Damaged",   bg: "#fce7f3", color: "#9d174d" },
    DISPOSED:  { label: "Disposed",  bg: "#f1f5f9", color: "#64748b" },
  };
  const s = map[condition] ?? { label: condition, bg: "#f1f5f9", color: "#64748b" };
  return <span className="text-[0.72rem] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>{s.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    AVAILABLE:         { label: "Available",   bg: "#dcfce7", color: "#15803d" },
    IN_USE:            { label: "In Use",      bg: "#dbeafe", color: "#1d4ed8" },
    CHECKED_OUT:       { label: "Checked Out", bg: "#fef9c3", color: "#854d0e" },
    UNDER_MAINTENANCE: { label: "Maintenance", bg: "#fce7f3", color: "#9d174d" },
    DISPOSED:          { label: "Disposed",    bg: "#f1f5f9", color: "#64748b" },
    LOST:              { label: "Lost",        bg: "#fee2e2", color: "#dc2626" },
  };
  const s = map[status] ?? { label: status, bg: "#f1f5f9", color: "#64748b" };
  return <span className="text-[0.72rem] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>{s.label}</span>;
}

export default async function InventoryItemsPage({
  searchParams,
}: {
  searchParams: { categoryId?: string; status?: string; search?: string; page?: string };
}) {
  const session = await requireStaff();
  const canManage = ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"].includes(session.role);

  const page = Number(searchParams.page ?? 1);
  const [{ items, total, pages }, categories] = await Promise.all([
    getInventoryItems({
      categoryId: searchParams.categoryId,
      status:     searchParams.status as InventoryStatus | undefined,
      search:     searchParams.search,
      page,
    }),
    getInventoryCategories(),
  ]);

  return (
    <div className="space-y-5 animate-fade-in relative">
      {/* Header */}
      <div className="page-hero flex items-start justify-between gap-4 flex-wrap relative z-10">
        <div>
          <p className="section-eyebrow mb-3">
            <Link href="/inventory" className="opacity-70 hover:opacity-100 transition-opacity">Inventory</Link> / Items
          </p>
          <h1 className="page-title text-[2rem] mb-2">All Items</h1>
          <p className="page-hero-muted text-[0.95rem]">{total} item{total !== 1 ? "s" : ""} found</p>
        </div>
        {canManage && (
          <Link href="/inventory/items/new" className="btn-gold inline-flex items-center gap-2 flex-shrink-0 mt-3">+ Add Item</Link>
        )}
      </div>

      {/* Filters */}
      <form method="get" className="card p-4 px-5 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-[0.75rem] font-semibold text-[var(--slate)]">Search</label>
          <input name="search" defaultValue={searchParams.search ?? ""} className="input text-[0.85rem] py-1.5 px-2.5" placeholder="Name, serial, asset tag…" />
        </div>
        <div className="flex flex-col gap-1 min-w-[150px]">
          <label className="text-[0.75rem] font-semibold text-[var(--slate)]">Category</label>
          <select name="categoryId" defaultValue={searchParams.categoryId ?? ""} className="input text-[0.85rem] py-1.5 px-2.5">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="text-[0.75rem] font-semibold text-[var(--slate)]">Status</label>
          <select name="status" defaultValue={searchParams.status ?? ""} className="input text-[0.85rem] py-1.5 px-2.5">
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="IN_USE">In Use</option>
            <option value="CHECKED_OUT">Checked Out</option>
            <option value="UNDER_MAINTENANCE">Maintenance</option>
            <option value="DISPOSED">Disposed</option>
            <option value="LOST">Lost</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary text-[0.85rem] py-1.5 px-4">Apply</button>
          <Link href="/inventory/items" className="btn-secondary text-[0.85rem] py-1.5 px-3.5">Clear</Link>
        </div>
      </form>

      {/* Table */}
      <div className="card overflow-hidden relative z-10">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--cream)] border-b border-[var(--border)]">
              <tr>
                {["Item", "Category", "Location", "Serial / Asset Tag", "Qty", "Condition", "Status", "Actions"].map((h) => (
                  <th key={h} className="py-3 px-4 text-left text-[0.72rem] font-bold uppercase tracking-[0.4px] text-[var(--navy)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                  <td className="py-3 px-4">
                    <Link href={`/inventory/items/${item.id}`} className="no-underline">
                      <p className="font-semibold text-[var(--navy)] text-[0.875rem]">{item.name}</p>
                      {item.description && <p className="text-[0.72rem] text-[var(--muted)] mt-0.5">{item.description.slice(0, 55)}{item.description.length > 55 ? "…" : ""}</p>}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-[var(--slate)] text-[0.85rem] whitespace-nowrap">{item.category?.name ?? "—"}</td>
                  <td className="py-3 px-4 text-[var(--slate)] text-[0.85rem]">{item.location ?? "—"}</td>
                  <td className="py-3 px-4">
                    {item.serialNumber && <p className="text-[0.78rem] text-[var(--slate)] font-mono">S/N: {item.serialNumber}</p>}
                    {item.assetTag    && <p className="text-[0.78rem] text-[var(--muted)] font-mono"># {item.assetTag}</p>}
                    {!item.serialNumber && !item.assetTag && <span className="text-[var(--muted)]">—</span>}
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-[var(--navy)]">{item.quantity}</td>
                  <td className="py-3 px-4"><ConditionBadge condition={item.condition} /></td>
                  <td className="py-3 px-4"><StatusBadge status={item.status} /></td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <Link href={`/inventory/items/${item.id}`} className="btn-secondary text-[0.78rem] py-0.5 px-2.5">View</Link>
                      {canManage && (
                        <Link href={`/inventory/items/${item.id}/edit`} className="text-[0.78rem] font-semibold text-[var(--gold)] py-0.5 px-2.5 rounded border border-[rgba(200,163,90,0.4)] hover:border-[rgba(200,163,90,0.7)] transition-colors">Edit</Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 px-4 text-center text-[var(--muted)]">
                    No items found.{" "}
                    {canManage && <Link href="/inventory/items/new" className="text-[var(--gold)] font-semibold">Add the first item →</Link>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="py-3.5 px-5 border-t border-[var(--border)] flex justify-between items-center">
            <span className="text-[0.8rem] text-[var(--muted)]">Page {page} of {pages}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`} className="btn-secondary text-[0.8rem] py-1 px-3">← Prev</Link>
              )}
              {page < pages && (
                <Link href={`?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`} className="btn-primary text-[0.8rem] py-1 px-3">Next →</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
