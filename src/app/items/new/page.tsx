import { requirePerm } from "@/lib/auth/guards";
import AddItemForm from "@/components/items/AddItemForm";
import PageHeader from "@/components/layout/PageHeader";

import { Card } from "@/components/ui/card";

export default async function NewItemPage() {
  await requirePerm("items:manage");
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <PageHeader
        variant="hero"
        eyebrow="Catalog Management"
        title="Add Bookable Item"
        description="Single items guests can rent for external events — chairs, tables, tents, audio equipment, etc."
      />
      <Card className="p-6">
        <AddItemForm />
      </Card>
    </div>
  );
}
