import { requirePerm } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import MaintenanceForm from "@/components/maintenance/MaintenanceForm";

export default async function NewMaintenancePage({
  searchParams,
}: {
  searchParams: { taskId?: string; title?: string };
}) {
  await requirePerm("maintenance:create");

  const facilities = await prisma.facility.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">New Maintenance Request</h1>
        <p className="text-sm page-subtitle">The facility will be locked from bookings until resolved.</p>
      </div>
      <MaintenanceForm
        facilities={facilities}
        initialTitle={searchParams.title}
        taskId={searchParams.taskId}
      />
    </div>
  );
}
