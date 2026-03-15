import Link from "next/link";
import { requireStaff } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/utils";
import { getBookableItems, getBookableBundles } from "@/actions/bookable-items.actions";
import { Package, Layers, Plus, Pencil, Tag } from "lucide-react";
import DeleteItemButton from "@/components/items/DeleteItemButton";

export default async function ItemsPage() {
  const session = await requireStaff();
  const [items, bundles] = await Promise.all([getBookableItems(), getBookableBundles()]);
  const canManage = ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"].includes(session.role);

  return (
    <div className="space-y-6 animate-fade-in" style={{ position: "relative" }}>
      {/* Decorative */}
      <div style={{ position: "absolute", top: -60, right: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Header */}
      <div
        className="card"
        style={{
          padding: "24px 28px",
          background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
          borderColor: "rgba(200,163,90,0.3)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.6)", marginBottom: 8, fontWeight: 700 }}>
              Catalog Management
            </p>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 2.5vw, 2.5rem)", fontWeight: 700, color: "#fff", lineHeight: 1.1, marginBottom: 4 }}>
              Bookable Items & Packages
            </h1>
            <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.75)" }}>
              Manage single items and package bundles available for external event bookings
            </p>
          </div>
          {canManage && (
            <div className="flex gap-2 flex-wrap">
              <Link
                href="/items/new"
                className="btn-gold flex items-center gap-2"
              >
                <Plus size={15} /> Add Item
              </Link>
              <Link
                href="/items/bundles/new"
                className="btn-secondary flex items-center gap-2"
                style={{ color: "#fff", borderColor: "rgba(255,255,255,0.25)" }}
              >
                <Layers size={15} /> New Package
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ position: "relative", zIndex: 1 }}>
        {[
          { label: "Total Items", value: items.length, icon: Package, color: "var(--navy)" },
          { label: "Active Items", value: items.filter(i => i.isActive).length, icon: Package, color: "#16a34a" },
          { label: "Packages", value: bundles.length, icon: Layers, color: "var(--gold)" },
          { label: "Total Units", value: items.reduce((s, i) => s + i.quantity, 0), icon: Tag, color: "#7c3aed" },
        ].map(stat => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}18` }}>
                <stat.icon size={16} style={{ color: stat.color }} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>{stat.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--navy)" }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Items Table */}
      <div className="card overflow-hidden" style={{ background: "linear-gradient(135deg,#FFFFFF 0%,#FEFDFB 100%)", position: "relative", zIndex: 1 }}>
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--navy)] flex items-center gap-2">
            <Package size={16} /> Single Items
          </h2>
          {canManage && (
            <Link href="/items/new" className="text-xs font-semibold text-[var(--navy)] hover:underline flex items-center gap-1">
              <Plus size={12} /> Add
            </Link>
          )}
        </div>
        {items.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={36} className="mx-auto mb-3" style={{ color: "var(--gold)" }} />
            <p className="font-semibold text-[var(--navy)] mb-1">No items yet</p>
            <p className="text-sm text-[var(--muted)] mb-4">Add chairs, tents, audio equipment — anything guests can rent.</p>
            <Link href="/items/new" className="btn-gold text-sm px-4 py-2">Add First Item</Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "linear-gradient(135deg,rgba(10,22,40,0.03) 0%,rgba(10,22,40,0.01) 100%)", borderBottom: "1px solid var(--border)" }}>
                <tr>
                  {["Item", "Unit", "Price / Unit", "Stock", "Tags", "Status", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-[var(--cream)]">
                    <td style={{ padding: "12px 16px" }}>
                      <p className="font-semibold text-[var(--navy)]">{item.name}</p>
                      {item.description && <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-1">{item.description}</p>}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--slate)" }}>{item.unit}</td>
                    <td style={{ padding: "12px 16px", color: "var(--navy)", fontWeight: 600 }}>
                      {formatCurrency(Number(item.pricePerUnit))}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--slate)" }}>{item.quantity}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--cream)", color: "var(--muted)", border: "1px solid var(--border)" }}>{t}</span>
                        ))}
                        {item.tags.length > 3 && <span className="text-xs text-[var(--muted)]">+{item.tags.length - 3}</span>}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className={`badge ${item.isActive ? "badge-success" : "badge-muted"}`}>
                        {item.isActive ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                        {canManage ? (
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/items/${item.id}/edit`} className="btn-secondary text-xs px-2 py-1 flex items-center gap-1">
                              <Pencil size={12} /> Edit
                            </Link>
                            <DeleteItemButton id={item.id} type="item" name={item.name} />
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">View only</span>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bundles Table */}
      <div className="card overflow-hidden" style={{ background: "linear-gradient(135deg,#FFFFFF 0%,#FEFDFB 100%)", position: "relative", zIndex: 1 }}>
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--navy)] flex items-center gap-2">
            <Layers size={16} /> Packages & Bouquets
          </h2>
          {canManage && (
            <Link href="/items/bundles/new" className="text-xs font-semibold text-[var(--navy)] hover:underline flex items-center gap-1">
              <Plus size={12} /> Add Package
            </Link>
          )}
        </div>
        {bundles.length === 0 ? (
          <div className="py-16 text-center">
            <Layers size={36} className="mx-auto mb-3" style={{ color: "var(--gold)" }} />
            <p className="font-semibold text-[var(--navy)] mb-1">No packages yet</p>
            <p className="text-sm text-[var(--muted)] mb-4">Create a bundle combining multiple items into one convenient package.</p>
            <Link href="/items/bundles/new" className="btn-gold text-sm px-4 py-2">Create First Package</Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "linear-gradient(135deg,rgba(10,22,40,0.03) 0%,rgba(10,22,40,0.01) 100%)", borderBottom: "1px solid var(--border)" }}>
                <tr>
                  {["Package", "Tagline", "Contents", "Price", "Status", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bundles.map(bundle => (
                  <tr key={bundle.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-[var(--cream)]">
                    <td style={{ padding: "12px 16px" }}>
                      <p className="font-semibold text-[var(--navy)]">{bundle.name}</p>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--slate)", maxWidth: 200 }}>
                      <p className="line-clamp-1">{bundle.tagline ?? "—"}</p>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--slate)" }}>
                      {bundle.components.length} item{bundle.components.length !== 1 ? "s" : ""}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {bundle.components.slice(0, 2).map(c => (
                          <span key={c.id} className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--cream)", color: "var(--muted)" }}>
                            {c.quantity}× {c.label ?? c.item.name}
                          </span>
                        ))}
                        {bundle.components.length > 2 && <span className="text-xs text-[var(--muted)]">+{bundle.components.length - 2} more</span>}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--navy)", fontWeight: 600 }}>
                      {formatCurrency(Number(bundle.price))}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className={`badge ${bundle.isActive ? "badge-success" : "badge-muted"}`}>
                        {bundle.isActive ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                        {canManage ? (
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/items/bundles/${bundle.id}/edit`} className="btn-secondary text-xs px-2 py-1 flex items-center gap-1">
                              <Pencil size={12} /> Edit
                            </Link>
                            <DeleteItemButton id={bundle.id} type="bundle" name={bundle.name} />
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">View only</span>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
