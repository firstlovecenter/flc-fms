import { Tag } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { getInventoryCategories } from "@/actions/inventory.actions";
import InventoryCategoryManager from "@/components/inventory/InventoryCategoryManager";
import PageHeader from "@/components/layout/PageHeader";

export default async function InventoryCategoriesPage() {
  const session    = await requireStaff();
  const canManage  = ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"].includes(session.role);
  const categories = await getInventoryCategories();

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        variant="hero"
        eyebrow="Inventory · Categories"
        title="Item Categories"
        description={`${categories.length} categor${categories.length !== 1 ? "ies" : "y"} · Organise inventory by type`}
        className="relative z-10"
        actions={<Tag size={20} className="text-[rgba(200,163,90,0.7)]" />}
      />

      {/* Manager */}
      <InventoryCategoryManager initialCategories={categories} canManage={canManage} />
    </div>
  );
}
