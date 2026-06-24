import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePerm } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import TimeSlotManager from "@/components/facilities/TimeSlotManager";

export default async function FacilitySlotsPage({ params }: { params: { id: string } }) {
  await requirePerm("facilities:manage");

  const facility = await prisma.facility.findFirst({
    where: { id: params.id },
    include: {
      timeSlots: {
        where: { isActive: true },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      pricing: {
        where: { isActive: true },
        select: { category: true },
      },
    },
  });

  if (!facility) notFound();

  const mappedCategories = new Set(facility.pricing.map((p) => p.category));
  const dbCategories = await prisma.bookingCategory.findMany({
    where: { isActive: true },
    select: { slug: true, name: true },
    orderBy: { sortOrder: "asc" },
  });

  const bookingCategories = dbCategories
    .filter((c) => mappedCategories.has(c.slug))
    .map((c) => ({
    value: c.slug,
    label: c.name,
  }));

  // Serialize Decimal fields so they cross the server→client boundary safely
  const slots = facility.timeSlots.map((s) => ({
    ...s,
    pricePerHourOverride: s.pricePerHourOverride != null ? s.pricePerHourOverride.toString() : null,
  }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href={`/facilities/${params.id}`} className="p-2 rounded-lg hover:bg-gray-100 text-[var(--muted)]">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="page-title">Time Slots — {facility.name}</h1>
          <p className="page-subtitle mt-0.5">
            Configure when this venue is available for bookings. You can set fixed slots (e.g. 8 AM – 10 AM)
            or flexible windows that bookers can subdivide.
          </p>
        </div>
      </div>

      <TimeSlotManager facilityId={params.id} initialSlots={slots} bookingCategories={bookingCategories} />
    </div>
  );
}
