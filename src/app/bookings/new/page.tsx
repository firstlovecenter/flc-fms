import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import BookingForm from "@/components/bookings/BookingForm";
import { getCeremonyDays } from "@/actions/ceremony-venue.actions";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: { facilityId?: string };
}) {
  const session = await requirePermission("canCreateBookings");

  const [ceremonyDays, facilitiesRaw] = await Promise.all([
    getCeremonyDays(),
    prisma.facility.findMany({
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
    }),
  ]);

  const serialized = facilitiesRaw.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    capacity: f.capacity,
    requiresBookingTerms: f.requiresBookingTerms,
    requiresItemBookingTerms: f.requiresItemBookingTerms,
    acUsageFee: Number(f.acUsageFee),
    pricePerHour: (f.pricing[0]?.price ?? 0).toString(),
    amenities: f.amenities,
    availableDays: f.availableDays,
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">New Booking</h1>
        <p className="text-sm page-subtitle">Schedule a facility for staff use.</p>
      </div>
      <BookingForm
        facilities={serialized}
        defaultFacilityId={searchParams.facilityId}
        currentUserRole={session.role}
        ceremonyDays={ceremonyDays}
      />
    </div>
  );
}
