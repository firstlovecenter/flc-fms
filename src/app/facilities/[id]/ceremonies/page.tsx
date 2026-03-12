import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import CeremonyDayManager from "@/components/facilities/CeremonyDayManager";

export default async function FacilityCeremoniesPage({ params }: { params: { id: string } }) {
  await requirePermission("canManageFacilities");

  const facility = await prisma.facility.findFirst({
    where: { id: params.id },
    include: {
      ceremonyDays: {
        where: { isActive: true },
        include: {
          timeSlots: {
            where: { isActive: true },
            orderBy: { startTime: "asc" },
          },
          createdBy: { select: { name: true } },
        },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!facility) notFound();

  // Serialize Decimal fields
  const days = facility.ceremonyDays.map((d) => ({
    ...d,
    timeSlots: d.timeSlots.map((s) => ({
      ...s,
      pricePerHour: s.pricePerHour != null ? s.pricePerHour.toString() : null,
    })),
  }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href={`/facilities/${params.id}`} className="p-2 rounded-lg hover:bg-gray-100 text-[var(--muted)]">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="page-title">Ceremony Days — {facility.name}</h1>
          <p className="page-subtitle mt-0.5">
            Reserve specific dates for ceremonies (weddings, baby dedications, etc.) and set their dedicated time slots.
            When patrons book a ceremony type, only these reserved dates and times will appear.
          </p>
        </div>
      </div>

      <CeremonyDayManager facilityId={params.id} initialDays={days} />
    </div>
  );
}
