import { requirePerm } from "@/lib/auth/guards";
import { getInventoryCategories } from "@/actions/inventory.actions";
import InventoryItemForm from "@/components/inventory/InventoryItemForm";
import PageHeader from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";

export default async function NewInventoryItemPage() {
  await requirePerm("inventory:manage");
  const categories = await getInventoryCategories();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <PageHeader
        variant="hero"
        eyebrow="Inventory · Items"
        title="Add Item"
        description="Register a new inventory item — equipment, furniture, or other trackable assets."
      />
      <Card className="p-6">
        <InventoryItemForm categories={categories} />
      </Card>
    </div>
  );
}
