import Link from "next/link";
import { Tag } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { getInventoryCategories } from "@/actions/inventory.actions";
import InventoryCategoryManager from "@/components/inventory/InventoryCategoryManager";

export default async function InventoryCategoriesPage() {
  const session    = await requireStaff();
  const canManage  = ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"].includes(session.role);
  const categories = await getInventoryCategories();

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-hero flex items-start justify-between gap-4 flex-wrap relative z-10">
        <div>
          <p className="section-eyebrow mb-3">
            <Link href="/inventory" className="opacity-70 hover:opacity-100 transition-opacity">Inventory</Link> / Categories
          </p>
          <h1 className="page-title text-[2rem] mb-2">Item Categories</h1>
          <p className="page-hero-muted text-[0.95rem]">
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"} &bull; Organise inventory by type
          </p>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Tag size={20} className="text-[rgba(200,163,90,0.7)]" />
        </div>
      </div>

      {/* Manager */}
      <InventoryCategoryManager initialCategories={categories} canManage={canManage} />
    </div>
  );
}
