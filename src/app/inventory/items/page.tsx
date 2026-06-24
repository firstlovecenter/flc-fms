import Link from "next/link";
import { requirePerm } from "@/lib/auth/guards";
import { getInventoryItems, getInventoryCategories } from "@/actions/inventory.actions";
import type { InventoryStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import PageHeader from "@/components/layout/PageHeader";

import { Card } from "@/components/ui/card";

function ConditionBadge({ condition }: { condition: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    EXCELLENT: { label: "Excellent", classes: "bg-success/10 text-success border border-success/25" },
    GOOD:      { label: "Good",      classes: "bg-info/10 text-info border border-info/25" },
    FAIR:      { label: "Fair",      classes: "bg-warning/10 text-warning border border-warning/25" },
    POOR:      { label: "Poor",      classes: "bg-danger/10 text-danger border border-danger/25" },
    DAMAGED:   { label: "Damaged",   classes: "bg-danger/10 text-danger border border-danger/25" },
    DISPOSED:  { label: "Disposed",  classes: "bg-foreground/5 text-muted-foreground border border-foreground/10" },
  };
  const s = map[condition] ?? { label: condition, classes: "bg-foreground/5 text-muted-foreground border border-foreground/10" };
  return <span className={`text-[0.72rem] font-bold px-2 py-0.5 rounded-full ${s.classes}`}>{s.label}</span>;
}

function ItemStatusBadge({ status }: { status: string }) {
  if (status === "IN_USE") return <StatusBadge status="CHECKED_OUT" label="In Use" />;
  if (status === "LOST")   return <StatusBadge status="FAILED" label="Lost" />;
  return <StatusBadge status={status} />;
}

export default async function InventoryItemsPage({
  searchParams,
}: {
  searchParams: { categoryId?: string; status?: string; search?: string; page?: string };
}) {
  const session = await requirePerm("inventory:manage");
  const canManage = session.role === "SUPER_ADMIN" || (session.authContext?.permissions["inventory:manage"] ?? false);

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
      <PageHeader
        variant="hero"
        eyebrow="Inventory · Items"
        title="All Items"
        description={`${total} item${total !== 1 ? "s" : ""} found`}
        className="relative z-10"
        actions={
          canManage ? (
            <Link href="/inventory/items/new" className={cn(buttonVariants({ variant: "gold" }), "gap-2 flex-shrink-0")}>
              + Add Item
            </Link>
          ) : undefined
        }
      />

      {/* Filters */}
      <form method="get" ><Card className="p-4 px-5 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 min-w-[160px]">
          <Label className="text-[0.75rem] font-semibold text-[var(--slate)]">Search</Label>
          <Input name="search" defaultValue={searchParams.search ?? ""} className="text-[0.85rem]" placeholder="Name, serial, asset tag…" />
        </div>
        <div className="flex flex-col gap-1 min-w-[150px]">
          <Label className="text-[0.75rem] font-semibold text-[var(--slate)]">Category</Label>
          <NativeSelect name="categoryId" defaultValue={searchParams.categoryId ?? ""} className="w-full text-[0.85rem]">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1 min-w-[140px]">
          <Label className="text-[0.75rem] font-semibold text-[var(--slate)]">Status</Label>
          <NativeSelect name="status" defaultValue={searchParams.status ?? ""} className="w-full text-[0.85rem]">
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="IN_USE">In Use</option>
            <option value="CHECKED_OUT">Checked Out</option>
            <option value="UNDER_MAINTENANCE">Maintenance</option>
            <option value="DISPOSED">Disposed</option>
            <option value="LOST">Lost</option>
          </NativeSelect>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm">Apply</Button>
          <Link href="/inventory/items" className={buttonVariants({ variant: "outline", size: "sm" })}>Clear</Link>
        </div>
      </Card></form>

      {/* Table */}
      <Card className="overflow-hidden relative z-10">
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
                  <td className="py-3 px-4"><ItemStatusBadge status={item.status} /></td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <Link href={`/inventory/items/${item.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>View</Link>
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
                <Link href={`?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`} className={buttonVariants({ variant: "outline", size: "sm" })}>← Prev</Link>
              )}
              {page < pages && (
                <Link href={`?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`} className={buttonVariants({ variant: "default", size: "sm" })}>Next →</Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
