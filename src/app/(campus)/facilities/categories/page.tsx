import { requireStaff } from "@/lib/auth/guards";
import { getBookingCategories } from "@/actions/category.actions";
import CategoryManager from "@/components/facilities/CategoryManager";

export default async function CategoriesPage() {
  await requireStaff("FACILITY_MANAGER");
  const categories = await getBookingCategories(true);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Booking Categories</h1>
        <p className="page-subtitle">Manage categories available for facility bookings and pricing.</p>
      </div>
      <CategoryManager initialCategories={categories} />
    </div>
  );
}
