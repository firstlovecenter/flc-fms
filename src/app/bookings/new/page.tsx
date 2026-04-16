import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import BookingForm from "@/components/bookings/BookingForm";
import { getCeremonyDays, getCeremonyFacilityIds } from "@/actions/ceremony-venue.actions";
import { redirect } from "next/navigation";

const PRIVILEGED_ROLES = ["SUPER_ADMIN", "FACILITY_MANAGER", "BOOKING_MANAGER"];

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: { facilityId?: string; type?: string };
}) {
  const session = await requirePermission("canCreateBookings");

  const bookingType = searchParams.type ?? "regular"; // "regular" | "wedding" | "naming"
  const isCeremony  = bookingType === "wedding" || bookingType === "naming";

  // Ceremony bookings are restricted to privileged roles
  if (isCeremony && !PRIVILEGED_ROLES.includes(session.role)) {
    redirect("/bookings/new");
  }

  const ceremonyType = bookingType === "wedding" ? "WEDDING" : bookingType === "naming" ? "NAMING" : null;

  const [ceremonyDays, facilitiesRaw, ceremonyFacilityIds] = await Promise.all([
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
    ceremonyType ? getCeremonyFacilityIds(ceremonyType) : Promise.resolve(null),
  ]);

  let facilitiesFiltered = facilitiesRaw;
  if (ceremonyType && ceremonyFacilityIds) {
    facilitiesFiltered = facilitiesRaw.filter((f) => ceremonyFacilityIds.includes(f.id));
  }

  const serialized = facilitiesFiltered.map((f) => ({
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

  const titles: Record<string, { title: string; subtitle: string }> = {
    regular: { title: "New Booking",          subtitle: "Schedule a facility for staff use." },
    wedding: { title: "New Wedding Booking",  subtitle: "Book a ceremony venue for a wedding directly." },
    naming:  { title: "New Naming Booking",   subtitle: "Book a ceremony venue for a naming directly." },
  };
  const { title, subtitle } = titles[bookingType] ?? titles.regular;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="text-sm page-subtitle">{subtitle}</p>
      </div>
      <BookingForm
        facilities={serialized}
        defaultFacilityId={searchParams.facilityId}
        currentUserRole={session.role}
        ceremonyDays={ceremonyDays}
        isCeremonyBooking={isCeremony}
        defaultCategory={ceremonyType ?? undefined}
      />
    </div>
  );
}
