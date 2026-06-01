import { requireStaff } from "@/lib/auth/guards";
import { getBookableItems } from "@/actions/bookable-items.actions";
import AddBundleForm from "@/components/items/AddBundleForm";

export default async function NewBundlePage() {
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  const items = await getBookableItems();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="page-hero">
        <p className="section-eyebrow mb-3">Catalog Management</p>
        <h1 className="page-title text-[1.8rem] mb-2">Create Package / Bouquet</h1>
        <p className="page-hero-muted text-[0.95rem]">
          Combine multiple items into a single curated package with a flat rate price.
        </p>
      </div>
      <div className="card p-6">
        <AddBundleForm availableItems={items} />
      </div>
    </div>
  );
}
