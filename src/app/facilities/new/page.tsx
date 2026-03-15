import { requireStaff } from "@/lib/auth/guards";
import FacilityForm from "@/components/facilities/FacilityForm";
import { getBookingCategories } from "@/actions/category.actions";

export default async function NewFacilityPage() {
  await requireStaff("FACILITY_MANAGER");
  const categories = await getBookingCategories(false);
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Add Facility</h1>
        <p className="text-sm page-subtitle">Create a new bookable facility for this campus.</p>
      </div>
      <FacilityForm categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />
    </div>
  );
}
