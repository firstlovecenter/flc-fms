import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import GuestBookingForm from "@/components/public/GuestBookingForm";
import GuestItemBookingForm from "@/components/public/GuestItemBookingForm";
import PublicTopNav from "@/components/public/PublicTopNav";

type SearchParams = {
  facilityId?: string;
  type?: string;
  lines?: string; // e.g. "item=abc123:2,bundle=xyz:1"
  ceremonyType?: string;
  codeId?: string;
};

/** Parse the ?lines= param from ItemsCatalogClient cart */
function parseLines(raw: string | undefined) {
  if (!raw) return [];
  return raw.split(",").flatMap(seg => {
    const [typeAndId, qtyStr] = seg.split(":");
    const qty = parseInt(qtyStr ?? "1", 10);
    if (!typeAndId || isNaN(qty) || qty < 1) return [];
    const [type, id] = typeAndId.split("=");
    if ((type !== "item" && type !== "bundle") || !id) return [];
    return [{ type: type as "item" | "bundle", id, qty }];
  });
}

export default async function GuestBookPage({ searchParams }: { searchParams: SearchParams }) {
  const isItemBooking = searchParams.type === "items";
  const isCeremonyBooking = !!searchParams.ceremonyType && !!searchParams.codeId;

  // For ceremony bookings, look up the flat price
  let ceremonyFlatPrice: number | undefined;
  if (isCeremonyBooking && searchParams.facilityId && searchParams.ceremonyType) {
    const cfg = await prisma.ceremonyVenueConfig.findUnique({
      where: {
        facilityId_type: {
          facilityId: searchParams.facilityId,
          type: searchParams.ceremonyType as "WEDDING" | "NAMING",
        },
      },
    });
    if (cfg) ceremonyFlatPrice = Number(cfg.price);
  }

  const facilities = (await prisma.facility.findMany({
    where: { isActive: true, underMaintenance: false },
    select: {
      id: true,
      name: true,
      description: true,
      capacity: true,
      requiresBookingTerms: true,
      requiresItemBookingTerms: true,
      acUsageFee: true,
      amenities: true,
      availableDays: true,
      pricing: {
        where: { isActive: true },
        select: { price: true },
        orderBy: { price: "asc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  })).map(f => ({
    id: f.id,
    name: f.name,
    description: f.description,
    capacity: f.capacity,
    requiresBookingTerms: f.requiresBookingTerms,
    requiresItemBookingTerms: f.requiresItemBookingTerms,
    acUsageFee: Number(f.acUsageFee),
    amenities: f.amenities,
    availableDays: f.availableDays,
    pricePerHour: (f.pricing[0]?.price ?? 0).toString(),
  }));

  // For item bookings: resolve pre-selected lines from URL
  let initialLines: Array<{
    type: "item" | "bundle";
    id: string;
    name: string;
    unitPrice: number;
    unit: string;
    qty: number;
    requiresBookingTerms: boolean;
    requiresItemBookingTerms: boolean;
  }> = [];

  if (isItemBooking) {
    const parsed = parseLines(searchParams.lines);
    for (const seg of parsed) {
      if (seg.type === "item") {
        const item = await prisma.bookableItem.findUnique({ where: { id: seg.id } });
        if (item) {
          initialLines.push({
            type: "item",
            id: item.id,
            name: item.name,
            unitPrice: Number(item.pricePerUnit),
            unit: item.unit,
            qty: seg.qty,
            requiresBookingTerms: item.requiresBookingTerms,
            requiresItemBookingTerms: item.requiresItemBookingTerms,
          });
        }
      } else {
        const bundle = await prisma.bookableBundle.findUnique({ where: { id: seg.id } });
        if (bundle) {
          initialLines.push({
            type: "bundle",
            id: bundle.id,
            name: bundle.name,
            unitPrice: Number(bundle.price),
            unit: "package",
            qty: seg.qty,
            requiresBookingTerms: bundle.requiresBookingTerms,
            requiresItemBookingTerms: bundle.requiresItemBookingTerms,
          });
        }
      }
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", top: -220, right: -180, width: 560, height: 560,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,163,90,0.15) 0%, rgba(200,163,90,0) 70%)",
          pointerEvents: "none",
        }}
      />

      <PublicTopNav current="guest" />

      <main className="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-12 space-y-6">
        {/* Hero card */}
        <section
          className="rounded-[20px] border relative overflow-hidden bg-gradient-to-br from-[rgba(10,22,40,0.97)] to-[rgba(28,48,88,0.94)] dark:from-[rgba(15,26,43,0.65)] dark:to-[rgba(15,26,43,0.45)] dark:backdrop-blur-xl border-[rgba(200,163,90,0.34)] dark:border-[rgba(255,255,255,0.08)] shadow-xl text-white"
          style={{
            padding: "26px 22px",
          }}
        >
          <p className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.65)" }}>
            {isItemBooking ? "Items & Packages Booking" : "Public Booking"}
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.9rem, 3vw, 2.6rem)", lineHeight: 1.1 }}>
            {isItemBooking ? "Item Booking Request" : "Guest Booking Request"}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.76)", marginTop: 6, maxWidth: 700 }}>
            {isItemBooking
              ? "Reserve items or packages for your external event. Our team will confirm availability and pricing."
              : <>Submit a booking as a guest, or <Link href="/patron/register" style={{ color: "var(--gold-pale)", textDecoration: "underline" }}>create an account</Link> to track your booking status.</>
            }
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {isItemBooking ? (
              <>
                <span className="badge" style={{ background: "rgba(200,163,90,0.15)", color: "var(--gold-pale)", border: "1px solid rgba(200,163,90,0.45)" }}>
                  {initialLines.length} item type{initialLines.length !== 1 ? "s" : ""} selected
                </span>
                <Link href="/?tab=items" className="badge" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", textDecoration: "none" }}>
                  ← Back to Home
                </Link>
              </>
            ) : (
              <>
                <span className="badge" style={{ background: "rgba(200,163,90,0.15)", color: "var(--gold-pale)", border: "1px solid rgba(200,163,90,0.45)" }}>
                  {facilities.length} facilities available
                </span>
                <span className="badge" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}>
                  Same-day review by staff
                </span>
                <Link href="/?tab=items" className="badge" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", textDecoration: "none" }}>
                  Browse items →
                </Link>
              </>
            )}
          </div>
        </section>

        <section>
          {isItemBooking ? (
            <div className="card p-6 md:p-7 bg-gradient-to-b from-[#FFFFFF] to-[#FCFAF6] dark:from-[rgba(15,26,43,0.45)] dark:to-[rgba(15,26,43,0.45)]">
              <GuestItemBookingForm initialLines={initialLines} />
            </div>
          ) : (
            <GuestBookingForm
              facilities={facilities}
              defaultFacilityId={searchParams.facilityId}
              isCeremonyBooking={isCeremonyBooking}
              ceremonyCodeId={searchParams.codeId}
              ceremonyFlatPrice={ceremonyFlatPrice}
              defaultCategory={searchParams.ceremonyType}
            />
          )}
        </section>
      </main>
    </div>
  );
}
