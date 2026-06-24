import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth/guards";
import { getActiveStaffForDuty, getDutyLogById } from "@/lib/duty/queries";
import EditDutyAssignmentForm from "@/components/duty/EditDutyAssignmentForm";

export default async function EditDutyAssignmentPage({
  params,
}: {
  params: { id: string };
}) {
  await requirePerm("duty:manage");

  const log = await getDutyLogById(params.id);
  if (!log) notFound();
  if (log.status === "SIGNED_OFF") {
    notFound();
  }

  const staff = await getActiveStaffForDuty();

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <Link href={`/duty/${log.id}`} className="text-sm text-[var(--gold)] hover:underline">
          ← Back to duty log
        </Link>
        <h1 className="text-2xl font-bold text-[var(--navy)] mt-2">Edit assignment</h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          Change the date or staff member for this duty.
        </p>
      </div>

      <EditDutyAssignmentForm
        dutyLogId={log.id}
        formName={log.template.name}
        staff={staff}
        defaultDate={format(log.date, "yyyy-MM-dd")}
        defaultAssignedToId={log.assignedToId}
      />
    </div>
  );
}
