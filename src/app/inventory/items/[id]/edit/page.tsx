import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePerm } from "@/lib/auth/guards";
import { getInventoryItem, getInventoryCategories } from "@/actions/inventory.actions";
import InventoryItemForm from "@/components/inventory/InventoryItemForm";
import { Card } from "@/components/ui/card";

export default async function EditInventoryItemPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await requirePerm("inventory:manage");

  const [item, categories] = await Promise.all([
    getInventoryItem(params.id),
    getInventoryCategories(),
  ]);
  if (!item) notFound();

  const defaultValues = {
    categoryId:   item.categoryId,
    name:         item.name,
    description:  item.description,
    serialNumber: item.serialNumber,
    assetTag:     item.assetTag,
    condition:    item.condition,
    status:       item.status,
    location:     item.location,
    quantity:     item.quantity,
    unitCost:     item.unitCost != null ? Number(item.unitCost) : null,
    purchaseDate: item.purchaseDate,
    supplier:     item.supplier,
    warrantyExp:  item.warrantyExp,
    notes:        item.notes,
    images:       item.images,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <Link href={`/inventory/items/${item.id}`} className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--navy)] mb-1">
          <ArrowLeft size={14} /> Back to Item
        </Link>
        <h1 className="page-title">Edit Item</h1>
        <p className="page-subtitle">{item.name}</p>
      </div>

      <Card className="p-6">
        <InventoryItemForm categories={categories} itemId={item.id} defaultValues={defaultValues} />
      </Card>
    </div>
  );
}
