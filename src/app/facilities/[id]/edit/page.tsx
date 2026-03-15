import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import FacilityForm from "@/components/facilities/FacilityForm";
import { getBookingCategories } from "@/actions/category.actions";

export default async function EditFacilityPage({ params }: { params: { id: string } }) {
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  const categories = await getBookingCategories(false);

  const facility = await prisma.facility.findFirst({
    where: { id: params.id },
    include: {
      pricing: {
        select: {
          category: true,
          pricePerHour: true,
          pricePerDay: true,
          freeDays: true,
          description: true,
          isActive: true,
        },
      },
    },
  });
  if (!facility) notFound();

  const pricing = facility.pricing.map((p) => ({
    category: p.category,
    pricePerHour: Number(p.pricePerHour),
    pricePerDay: p.pricePerDay != null ? Number(p.pricePerDay) : null,
    freeDays: p.freeDays,
    description: p.description,
    isActive: p.isActive,
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Edit Facility</h1>
        <p className="text-sm page-subtitle">{facility.name}</p>
      </div>
      <FacilityForm
        facility={{ ...facility, pricing }}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
      />
    </div>
  );
}
