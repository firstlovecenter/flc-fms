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
      <div
        className="card"
        style={{
          padding: "24px 28px",
          background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
          borderColor: "rgba(200,163,90,0.3)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8, color: "rgba(255,255,255,0.6)" }}>
            <Link href="/inventory" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Inventory</Link> / Categories
          </p>
          <h1 style={{ fontSize: "clamp(1.5rem, 2.2vw, 2rem)", fontWeight: 700, fontFamily: "var(--font-display)", color: "#fff", marginBottom: 6 }}>
            Item Categories
          </h1>
          <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.7)" }}>
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"} &bull; Organise inventory by type
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Tag size={20} style={{ color: "rgba(200,163,90,0.7)" }} />
        </div>
      </div>

      {/* Manager */}
      <InventoryCategoryManager initialCategories={categories} canManage={canManage} />
    </div>
  );
}
