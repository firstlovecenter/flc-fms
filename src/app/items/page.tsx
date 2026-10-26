import Link from "next/link";
import { requirePerm } from "@/lib/auth/guards";
import { cn, formatCurrency } from "@/lib/utils";
import { getBookableItems, getBookableBundles } from "@/actions/bookable-items.actions";
import { Package, Layers, Plus, Pencil, Tag } from "lucide-react";
import DeleteItemButton from "@/components/items/DeleteItemButton";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function ItemsPage() {
  const session = await requirePerm("items:view");
  const [items, bundles] = await Promise.all([getBookableItems(), getBookableBundles()]);
  const canManage = session.role === "SUPER_ADMIN" || (session.authContext?.permissions["items:manage"] ?? false);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <PageHeader
        title="Items & packages"
        description="Chairs, tents, sound equipment and bundles that guests can add to an event booking."
        className="mb-0"
        actions={
          canManage ? (
            <>
              <Link
                href="/items/bundles/new"
                className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
              >
                <Layers size={15} /> New package
              </Link>
              <Link
                href="/items/new"
                className={cn(buttonVariants({ variant: "default" }), "gap-2")}
              >
                <Plus size={15} /> Add item
              </Link>
            </>
          ) : undefined
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Items"     value={items.length} color="inventory" icon={<Package size={16} />} sub="Single rentable items" />
        <StatCard label="Active"    value={items.filter(i => i.isActive).length} color="success" icon={<Package size={16} />} sub="Shown to guests" />
        <StatCard label="Packages"  value={bundles.length} color="gold" icon={<Layers size={16} />} sub="Bundles of items" />
        <StatCard label="Units"     value={items.reduce((s, i) => s + i.quantity, 0)} color="neutral" icon={<Tag size={16} />} sub="Total stock" />
      </div>

      {/* Items Table */}
      <Card className="overflow-hidden p-0 gap-0">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--navy)] flex items-center gap-2">
            <Package size={16} /> Single items
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
            <Link href="/items/new" className={buttonVariants({ variant: "default" })}>Add first item</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {["Item", "Unit", "Price / unit", "Stock", "Tags", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-[var(--muted)] text-xs tracking-[0.04em] whitespace-nowrap font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-t border-border/60 hover:bg-muted/40">
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
                      <StatusBadge
                        status={item.isActive ? "APPROVED" : "CANCELLED"}
                        label={item.isActive ? "Active" : "Hidden"}
                        size="xs"
                      />
                    </td>
                    <td className="py-3 px-4">
                        {canManage ? (
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/items/${item.id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}>
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
      </Card>

      {/* Bundles Table */}
      <Card className="overflow-hidden p-0 gap-0">
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
            <Link href="/items/bundles/new" className={buttonVariants({ variant: "default" })}>Create First Package</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {["Package", "Tagline", "Contents", "Price", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-[var(--muted)] text-xs tracking-[0.04em] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bundles.map(bundle => (
                  <tr key={bundle.id} className="border-t border-border/60 hover:bg-muted/40">
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
                      <StatusBadge
                        status={bundle.isActive ? "APPROVED" : "CANCELLED"}
                        label={bundle.isActive ? "Active" : "Hidden"}
                        size="xs"
                      />
                    </td>
                    <td className="py-3 px-4">
                        {canManage ? (
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/items/bundles/${bundle.id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}>
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
      </Card>
    </div>
  );
}
