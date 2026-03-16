import { requirePatron } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import PatronBookingForm from "@/components/patron/PatronBookingForm";

export default async function PatronBookPage({ searchParams }: { searchParams: { facilityId?: string } }) {
  await requirePatron();

  const facilities = await prisma.facility.findMany({
    where: { isActive: true, underMaintenance: false },
    select: {
      id: true, name: true, description: true, capacity: true,
      acUsageFee: true,
      amenities: true,
      availableFrom: true, availableTo: true, availableDays: true,
      pricing: {
        where: { isActive: true },
        select: { price: true },
        orderBy: { price: "asc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const serialized = facilities.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    capacity: f.capacity,
    acUsageFee: Number(f.acUsageFee),
    amenities: f.amenities,
    availableFrom: f.availableFrom,
    availableTo: f.availableTo,
    availableDays: f.availableDays,
    pricePerHour: (f.pricing[0]?.price ?? 0).toString(),
  }));

  return (
    <div className="max-w-4xl space-y-6">
      <div style={{
        position: "relative",
        background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
        borderRadius: 12,
        padding: "32px 28px",
        color: "white",
        overflow: "hidden"
      }}>
        <div style={{
          position: "absolute",
          top: -40,
          right: -60,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "12px", color: "rgba(255,255,255,0.7)" }}>
            Facility Booking
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: "8px" }}>
            Book a Facility
          </h1>
          <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.9)" }}>
            Select a facility and your preferred time slot.
          </p>
        </div>
      </div>
      <PatronBookingForm facilities={serialized} defaultFacilityId={searchParams.facilityId} />
    </div>
  );
}
