import { requireRole } from "@/lib/auth/guards";
import { getBookingCategories } from "@/actions/category.actions";
import CategoryManager from "@/components/facilities/CategoryManager";

export default async function CategoriesPage() {
  await requireRole("SUPER_ADMIN");
  const categories = await getBookingCategories(false);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Booking Categories</h1>
        <p className="page-subtitle">Manage categories used in facility create/edit pairing.</p>
      </div>
      <CategoryManager initialCategories={categories} />
    </div>
  );
}
