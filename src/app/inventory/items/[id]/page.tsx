import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePerm } from "@/lib/auth/guards";
import { getInventoryItem } from "@/actions/inventory.actions";
import { formatCurrency } from "@/lib/utils";
import { ConditionBadge, ItemStatusBadge } from "@/components/inventory/ItemBadges";
import DeactivateItemButton from "@/components/inventory/DeactivateItemButton";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" });
}

export default async function InventoryItemDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await requirePerm("inventory:view");
  const canManage = session.role === "SUPER_ADMIN" || (session.authContext?.permissions["inventory:manage"] ?? false);

  const item = await getInventoryItem(params.id);
  if (!item) notFound();

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link href="/inventory/items" className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--navy)] mb-1">
            <ArrowLeft size={14} /> Back to Items
          </Link>
          <h1 className="page-title">{item.name}</h1>
          <p className="page-subtitle mt-1">{item.category?.name ?? "Uncategorized"}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link href={`/inventory/items/${item.id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Edit
            </Link>
            <DeactivateItemButton id={item.id} name={item.name} redirectTo="/inventory/items" />
          </div>
        )}
      </div>
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          <ItemStatusBadge status={item.status} />
          <ConditionBadge condition={item.condition} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <span className="text-[var(--muted)] font-medium uppercase tracking-wide text-xs">Quantity</span>
            <p className="mt-0.5 text-[var(--navy)]">{item.quantity}</p>
          </div>
          <div>
            <span className="text-[var(--muted)] font-medium uppercase tracking-wide text-xs">Location</span>
            <p className="mt-0.5 text-[var(--navy)]">{item.location ?? "—"}</p>
          </div>
          <div>
            <span className="text-[var(--muted)] font-medium uppercase tracking-wide text-xs">Serial Number</span>
            <p className="mt-0.5 text-[var(--navy)] font-mono">{item.serialNumber ?? "—"}</p>
          </div>
          <div>
            <span className="text-[var(--muted)] font-medium uppercase tracking-wide text-xs">Asset Tag</span>
            <p className="mt-0.5 text-[var(--navy)] font-mono">{item.assetTag ?? "—"}</p>
          </div>
          <div>
            <span className="text-[var(--muted)] font-medium uppercase tracking-wide text-xs">Unit Cost</span>
            <p className="mt-0.5 text-[var(--navy)]">{item.unitCost != null ? formatCurrency(Number(item.unitCost)) : "—"}</p>
          </div>
          <div>
            <span className="text-[var(--muted)] font-medium uppercase tracking-wide text-xs">Supplier</span>
            <p className="mt-0.5 text-[var(--navy)]">{item.supplier ?? "—"}</p>
          </div>
          <div>
            <span className="text-[var(--muted)] font-medium uppercase tracking-wide text-xs">Purchase Date</span>
            <p className="mt-0.5 text-[var(--navy)]">{item.purchaseDate ? fmt(item.purchaseDate) : "—"}</p>
          </div>
          <div>
            <span className="text-[var(--muted)] font-medium uppercase tracking-wide text-xs">Warranty Expiry</span>
            <p className="mt-0.5 text-[var(--navy)]">{item.warrantyExp ? fmt(item.warrantyExp) : "—"}</p>
          </div>
        </div>

        {item.description && (
          <div>
            <span className="text-[var(--muted)] font-medium uppercase tracking-wide text-xs">Description</span>
            <p className="mt-0.5 text-sm text-[var(--slate)] whitespace-pre-wrap">{item.description}</p>
          </div>
        )}

        {item.notes && (
          <div>
            <span className="text-[var(--muted)] font-medium uppercase tracking-wide text-xs">Notes</span>
            <p className="mt-0.5 text-sm text-[var(--slate)] whitespace-pre-wrap">{item.notes}</p>
          </div>
        )}

        {item.images.length > 0 && (
          <div className="flex gap-2 flex-wrap pt-1">
            {item.images.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              (<img key={src} src={src} alt={item.name} className="w-24 h-24 object-cover rounded-lg border border-[var(--border)]" />)
            ))}
          </div>
        )}
      </Card>
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h3 className="font-semibold text-[var(--navy)] text-sm">Recent Checkouts</h3>
        </div>
        {item.checkouts.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-[var(--muted)]">No checkout history.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Checked Out</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">By</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Purpose</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Returned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {item.checkouts.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2.5 text-xs text-[var(--muted)]">{fmt(c.checkedOutAt)}</td>
                    <td className="px-4 py-2.5 text-xs">{c.checkedOutBy.name}</td>
                    <td className="px-4 py-2.5 text-xs">{c.purpose}</td>
                    <td className="px-4 py-2.5 text-xs text-[var(--muted)]">{c.returnedAt ? fmt(c.returnedAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h3 className="font-semibold text-[var(--navy)] text-sm">Maintenance Log</h3>
        </div>
        {item.maintenanceLogs.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-[var(--muted)]">No maintenance history.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Title</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Priority</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Requested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {item.maintenanceLogs.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2.5 text-xs">{m.title}</td>
                    <td className="px-4 py-2.5 text-xs">{m.priority}</td>
                    <td className="px-4 py-2.5 text-xs">{m.status}</td>
                    <td className="px-4 py-2.5 text-xs text-[var(--muted)]">{fmt(m.createdAt)}</td>
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
