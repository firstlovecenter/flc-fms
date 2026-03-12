import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import BookingForm from "@/components/bookings/BookingForm";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: { facilityId?: string };
}) {
  await requireStaff();

  const facilities = await prisma.facility.findMany({
    where: { isActive: true, underMaintenance: false },
    select: {
      id: true, name: true, pricePerHour: true, capacity: true,
      timeSlots: {
        where: { isActive: true },
        select: {
          id: true, facilityId: true, label: true,
          dayOfWeek: true, startTime: true, endTime: true,
          isFlexible: true, isFree: true,
          pricePerHourOverride: true, maxBookings: true, category: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  // Serialize Decimal for client boundary
  const serialized = facilities.map((f) => ({
    ...f,
    pricePerHour: f.pricePerHour.toString(),
    timeSlots: f.timeSlots.map((s) => ({
      ...s,
      pricePerHourOverride: s.pricePerHourOverride != null ? s.pricePerHourOverride.toString() : null,
    })),
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
