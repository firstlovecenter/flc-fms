import { requireStaff } from "@/lib/auth/guards";
import { getBookableItems } from "@/actions/bookable-items.actions";
import AddBundleForm from "@/components/items/AddBundleForm";
import PageHeader from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";

export default async function NewBundlePage() {
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  const items = await getBookableItems();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <PageHeader
        variant="hero"
        eyebrow="Catalog Management"
        title="Create Package / Bouquet"
        description="Combine multiple items into a single curated package with a flat rate price."
      />
      <Card className="p-6">
        <AddBundleForm availableItems={items} />
      </Card>
    </div>
  );
}
