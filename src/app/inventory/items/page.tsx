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
  return <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, backgroundColor: s.bg, color: s.color }}>{s.label}</span>;
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
  return <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, backgroundColor: s.bg, color: s.color }}>{s.label}</span>;
}

export default async function InventoryItemsPage({
  searchParams,
}: {
  searchParams: { categoryId?: string; status?: string; search?: string; page?: string };
}) {
  const session = await requireStaff();
  const canManage = ["FACILITY_MANAGER", "SUPER_ADMIN"].includes(session.role);

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
    <div className="space-y-5 animate-fade-in" style={{ position: "relative" }}>
      {/* Header */}
      <div className="card" style={{ padding: "24px 28px", background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)", borderColor: "rgba(200,163,90,0.3)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8, color: "rgba(255,255,255,0.6)" }}>
            <Link href="/inventory" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Inventory</Link> / Items
          </p>
          <h1 style={{ fontSize: "clamp(1.5rem, 2.2vw, 2rem)", fontWeight: 700, fontFamily: "var(--font-display)", color: "#fff", marginBottom: 6 }}>All Items</h1>
          <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.7)" }}>{total} item{total !== 1 ? "s" : ""} found</p>
        </div>
        {canManage && (
          <Link href="/inventory/items/new" className="btn-gold" style={{ fontSize: "0.85rem" }}>+ Add Item</Link>
        )}
      </div>

      {/* Filters */}
      <form method="get" className="card" style={{ padding: "16px 20px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--slate)" }}>Search</label>
          <input name="search" defaultValue={searchParams.search ?? ""} className="input" style={{ padding: "6px 10px", fontSize: "0.85rem" }} placeholder="Name, serial, asset tag…" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 150 }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--slate)" }}>Category</label>
          <select name="categoryId" defaultValue={searchParams.categoryId ?? ""} className="input" style={{ padding: "6px 10px", fontSize: "0.85rem" }}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 140 }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--slate)" }}>Status</label>
          <select name="status" defaultValue={searchParams.status ?? ""} className="input" style={{ padding: "6px 10px", fontSize: "0.85rem" }}>
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="IN_USE">In Use</option>
            <option value="CHECKED_OUT">Checked Out</option>
            <option value="UNDER_MAINTENANCE">Maintenance</option>
            <option value="DISPOSED">Disposed</option>
            <option value="LOST">Lost</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="btn-primary" style={{ fontSize: "0.85rem", padding: "6px 16px" }}>Apply</button>
          <Link href="/inventory/items" className="btn-secondary" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>Clear</Link>
        </div>
      </form>

      {/* Table */}
      <div className="card overflow-hidden" style={{ position: "relative", zIndex: 1 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "linear-gradient(135deg, rgba(10,22,40,0.03) 0%, rgba(10,22,40,0.06) 100%)", borderBottom: "1px solid var(--border)" }}>
              <tr>
                {["Item", "Category", "Location", "Serial / Asset Tag", "Qty", "Condition", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", color: "var(--navy)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-[var(--cream)]">
                  <td style={{ padding: "12px 16px" }}>
                    <Link href={`/inventory/items/${item.id}`} style={{ textDecoration: "none" }}>
                      <p style={{ fontWeight: 600, color: "var(--navy)", fontSize: "0.875rem" }}>{item.name}</p>
                      {item.description && <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>{item.description.slice(0, 55)}{item.description.length > 55 ? "…" : ""}</p>}
                    </Link>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--slate)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>{item.category?.name ?? "—"}</td>
                  <td style={{ padding: "12px 16px", color: "var(--slate)", fontSize: "0.85rem" }}>{item.location ?? "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {item.serialNumber && <p style={{ fontSize: "0.78rem", color: "var(--slate)", fontFamily: "monospace" }}>S/N: {item.serialNumber}</p>}
                    {item.assetTag    && <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "monospace" }}># {item.assetTag}</p>}
                    {!item.serialNumber && !item.assetTag && <span style={{ color: "var(--muted)" }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "var(--navy)" }}>{item.quantity}</td>
                  <td style={{ padding: "12px 16px" }}><ConditionBadge condition={item.condition} /></td>
                  <td style={{ padding: "12px 16px" }}><StatusBadge status={item.status} /></td>
                  <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Link href={`/inventory/items/${item.id}`} style={{ fontSize: "0.78rem", color: "var(--navy)", fontWeight: 600, textDecoration: "none", padding: "3px 10px", border: "1px solid var(--border)", borderRadius: 6 }}>View</Link>
                      {canManage && (
                        <Link href={`/inventory/items/${item.id}/edit`} style={{ fontSize: "0.78rem", color: "var(--gold)", fontWeight: 600, textDecoration: "none", padding: "3px 10px", border: "1px solid rgba(200,163,90,0.4)", borderRadius: 6 }}>Edit</Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "40px 16px", textAlign: "center", color: "var(--muted)" }}>
                    No items found.{" "}
                    {canManage && <Link href="/inventory/items/new" style={{ color: "var(--gold)", fontWeight: 600 }}>Add the first item →</Link>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Page {page} of {pages}</span>
            <div style={{ display: "flex", gap: 8 }}>
              {page > 1 && (
                <Link href={`?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`} style={{ fontSize: "0.8rem", padding: "4px 12px", border: "1px solid var(--border)", borderRadius: 6, textDecoration: "none", color: "var(--navy)" }}>← Prev</Link>
              )}
              {page < pages && (
                <Link href={`?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`} style={{ fontSize: "0.8rem", padding: "4px 12px", border: "1px solid var(--border)", borderRadius: 6, textDecoration: "none", color: "var(--navy)" }}>Next →</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
