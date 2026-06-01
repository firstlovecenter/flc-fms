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
    <div className="space-y-6 animate-fade-in relative">
      {/* Decorative */}
      <div className="absolute top-[-60px] right-[-80px] w-[360px] h-[360px] rounded-full pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)" }} />

      {/* Header */}
      <div className="page-hero flex items-start justify-between gap-4 flex-wrap relative z-10">
        <div>
          <p className="section-eyebrow mb-3">Catalog Management</p>
          <h1 className="page-title mb-2">Bookable Items & Packages</h1>
          <p className="page-hero-muted text-[0.95rem]">
            Manage single items and package bundles available for external event bookings
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2 flex-wrap mt-3">
            <Link
              href="/items/new"
              className="btn-gold flex items-center gap-2"
            >
              <Plus size={15} /> Add Item
            </Link>
            <Link
              href="/items/bundles/new"
              className="btn-secondary flex items-center gap-2"
            >
              <Layers size={15} /> New Package
            </Link>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10 stagger-children">
        {[
          { label: "Total Items",  value: items.length,                                  icon: Package, accent: "blue"  as const },
          { label: "Active Items", value: items.filter(i => i.isActive).length,          icon: Package, accent: "green" as const },
          { label: "Packages",     value: bundles.length,                                icon: Layers,  accent: "gold"  as const },
          { label: "Total Units",  value: items.reduce((s, i) => s + i.quantity, 0),     icon: Tag,     accent: "gray"  as const },
        ].map(stat => (
          <div key={stat.label} className="stat-card" data-accent={stat.accent}>
            <div className="stat-accent" />
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={15} className="text-[var(--muted)]" />
              <p className="stat-label">{stat.label}</p>
            </div>
            <p className="stat-value">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Items Table */}
      <div className="card overflow-hidden relative z-10">
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
            <Package size={36} className="mx-auto mb-3 text-[var(--gold)]" />
            <p className="font-semibold text-[var(--navy)] mb-1">No items yet</p>
            <p className="text-sm text-[var(--muted)] mb-4">Add chairs, tents, audio equipment — anything guests can rent.</p>
            <Link href="/items/new" className="btn-gold text-sm px-4 py-2">Add First Item</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--cream)] border-b border-[var(--border)]">
                <tr>
                  {["Item", "Unit", "Price / Unit", "Stock", "Tags", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-semibold text-[var(--navy)] text-[0.78rem] uppercase tracking-[0.04em] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[var(--navy)]">{item.name}</p>
                      {item.description && <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-1">{item.description}</p>}
                    </td>
                    <td className="py-3 px-4 text-[var(--slate)]">{item.unit}</td>
                    <td className="py-3 px-4 text-[var(--navy)] font-semibold">
                      {formatCurrency(Number(item.pricePerUnit))}
                    </td>
                    <td className="py-3 px-4 text-[var(--slate)]">{item.quantity}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--cream)] text-[var(--muted)] border border-[var(--border)]">{t}</span>
                        ))}
                        {item.tags.length > 3 && <span className="text-xs text-[var(--muted)]">+{item.tags.length - 3}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${item.isActive ? "badge-success" : "badge-muted"}`}>
                        {item.isActive ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
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
      <div className="card overflow-hidden relative z-10">
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
            <Layers size={36} className="mx-auto mb-3 text-[var(--gold)]" />
            <p className="font-semibold text-[var(--navy)] mb-1">No packages yet</p>
            <p className="text-sm text-[var(--muted)] mb-4">Create a bundle combining multiple items into one convenient package.</p>
            <Link href="/items/bundles/new" className="btn-gold text-sm px-4 py-2">Create First Package</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--cream)] border-b border-[var(--border)]">
                <tr>
                  {["Package", "Tagline", "Contents", "Price", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-semibold text-[var(--navy)] text-[0.78rem] uppercase tracking-[0.04em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bundles.map(bundle => (
                  <tr key={bundle.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[var(--navy)]">{bundle.name}</p>
                    </td>
                    <td className="py-3 px-4 text-[var(--slate)] max-w-[200px]">
                      <p className="line-clamp-1">{bundle.tagline ?? "—"}</p>
                    </td>
                    <td className="py-3 px-4 text-[var(--slate)]">
                      {bundle.components.length} item{bundle.components.length !== 1 ? "s" : ""}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {bundle.components.slice(0, 2).map(c => (
                          <span key={c.id} className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--cream)] text-[var(--muted)]">
                            {c.quantity}× {c.label ?? c.item.name}
                          </span>
                        ))}
                        {bundle.components.length > 2 && <span className="text-xs text-[var(--muted)]">+{bundle.components.length - 2} more</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[var(--navy)] font-semibold">
                      {formatCurrency(Number(bundle.price))}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${bundle.isActive ? "badge-success" : "badge-muted"}`}>
                        {bundle.isActive ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
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
