import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import FacilityForm from "@/components/facilities/FacilityForm";

export default async function EditFacilityPage({ params }: { params: { id: string } }) {
  await requireStaff("FACILITY_MANAGER");

  const facility = await prisma.facility.findFirst({ where: { id: params.id } });
  if (!facility) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Edit Facility</h1>
        <p className="text-sm page-subtitle">{facility.name}</p>
      </div>
      <FacilityForm facility={facility} />
    </div>
  );
}
