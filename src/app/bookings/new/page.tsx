import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import BookingForm from "@/components/bookings/BookingForm";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: { facilityId?: string };
}) {
  await requirePermission("canCreateBookings");

  const facilities = await prisma.facility.findMany({
    where: { isActive: true, underMaintenance: false },
    select: {
      id: true,
      name: true,
      description: true,
      capacity: true,
      pricePerHour: true,
      amenities: true,
      availableDays: true,
    },
    orderBy: { name: "asc" },
  });

  const serialized = facilities.map((f) => ({
    ...f,
    pricePerHour: f.pricePerHour.toString(),
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">New Booking</h1>
        <p className="text-sm page-subtitle">Schedule a facility for staff use.</p>
      </div>
      <BookingForm facilities={serialized} defaultFacilityId={searchParams.facilityId} />
    </div>
  );
}
