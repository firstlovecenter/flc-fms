import { requireStaff } from "@/lib/auth/guards";
import { getBookableItems } from "@/actions/bookable-items.actions";
import AddBundleForm from "@/components/items/AddBundleForm";

export default async function NewBundlePage() {
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  const items = await getBookableItems();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div
        className="card"
        style={{
          padding: "24px 28px",
          background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
          borderColor: "rgba(200,163,90,0.3)",
        }}
      >
        <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.6)", marginBottom: 8, fontWeight: 700 }}>
          Catalog Management
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 700, color: "#fff" }}>
          Create Package / Bouquet
        </h1>
        <p style={{ color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
          Combine multiple items into a single curated package with a flat rate price.
        </p>
      </div>
      <div className="card p-6" style={{ background: "linear-gradient(135deg,#FFFFFF 0%,#FEFDFB 100%)" }}>
        <AddBundleForm availableItems={items} />
      </div>
    </div>
  );
}
