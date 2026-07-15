import { requirePatron } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import PatronBookingForm from "@/components/patron/PatronBookingForm";
import PageHeader from "@/components/layout/PageHeader";
import { getSiteSettings } from "@/actions/site-settings.actions";

export default async function PatronBookPage(props: { searchParams: Promise<{ facilityId?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await requirePatron();

  const patron = await prisma.patron.findUnique({
    where: { id: session.sub },
    select: { email: true },
  });

  const siteSettings = await getSiteSettings();

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
      <PageHeader
        variant="hero"
        eyebrow="Facility Booking"
        title="Book a Facility"
        description="Select a facility and your preferred time slot."
      />
      <PatronBookingForm
        facilities={serialized}
        defaultFacilityId={searchParams.facilityId}
        defaultContactEmail={patron?.email ?? ""}
        officePhone={siteSettings.officePhone || undefined}
        officeEmail={siteSettings.officeEmail || undefined}
      />
    </div>
  );
}
