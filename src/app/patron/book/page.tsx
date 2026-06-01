import { requirePatron } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import PatronBookingForm from "@/components/patron/PatronBookingForm";

export default async function PatronBookPage({ searchParams }: { searchParams: { facilityId?: string } }) {
  await requirePatron();

  const facilities = await prisma.facility.findMany({
    where: { isActive: true, underMaintenance: false },
    select: {
      id: true, name: true, description: true, capacity: true,
      requiresBookingTerms: true,
      requiresItemBookingTerms: true,
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
    requiresBookingTerms: f.requiresBookingTerms,
    requiresItemBookingTerms: f.requiresItemBookingTerms,
    acUsageFee: Number(f.acUsageFee),
    amenities: f.amenities,
    availableFrom: f.availableFrom,
    availableTo: f.availableTo,
    availableDays: f.availableDays,
    pricePerHour: (f.pricing[0]?.price ?? 0).toString(),
  }));

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <div className="page-hero relative z-10">
        <div className="absolute -top-10 -right-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)" }}
        />
        <div className="relative z-10">
          <p className="section-eyebrow mb-3">Facility Booking</p>
          <h1 className="page-title text-[2rem] mb-2">Book a Facility</h1>
          <p className="page-hero-muted text-[0.95rem]">
            Select a facility and your preferred time slot.
          </p>
        </div>
      </div>
      <PatronBookingForm facilities={serialized} defaultFacilityId={searchParams.facilityId} />
    </div>
  );
}
