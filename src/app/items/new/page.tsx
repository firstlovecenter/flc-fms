import { requireStaff } from "@/lib/auth/guards";
import AddItemForm from "@/components/items/AddItemForm";

export default async function NewItemPage() {
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="page-hero">
        <p className="section-eyebrow mb-3">Catalog Management</p>
        <h1 className="page-title text-[1.8rem] mb-2">Add Bookable Item</h1>
        <p className="page-hero-muted text-[0.95rem]">
          Single items guests can rent for external events — chairs, tables, tents, audio equipment, etc.
        </p>
      </div>
      <div className="card p-6">
        <AddItemForm />
      </div>
    </div>
  );
}
