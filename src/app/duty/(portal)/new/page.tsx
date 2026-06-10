import Link from "next/link";
import { format } from "date-fns";
import { requireStaff } from "@/lib/auth/guards";
import { getActiveStaffForDuty, getDutyTemplates } from "@/lib/duty/queries";
import AssignDutyForm from "@/components/duty/AssignDutyForm";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Create Duty" };

export default async function CreateDutyPage() {
  await requireStaff("FACILITY_MANAGER", "SUPER_ADMIN");

  const [templates, staff] = await Promise.all([
    getDutyTemplates(),
    getActiveStaffForDuty(),
  ]);

  if (templates.length === 0) {
    return (
      <Card className="p-8 text-center space-y-3">
        <p className="text-[var(--muted)]">No duty forms available yet.</p>
        <Link href="/duty/templates/new" className="text-[var(--gold)] hover:underline text-sm">
          Create a duty form (facility manager)
        </Link>
        <Link href="/duty" className="block text-[var(--gold)] hover:underline text-sm">
          Back to duty logs
        </Link>
      </Card>
    );
  }

  if (staff.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-[var(--muted)]">No active staff to assign.</p>
        <Link href="/duty" className="text-[var(--gold)] hover:underline mt-4 inline-block">
          Back to duty logs
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <Link href="/duty" className="text-sm text-[var(--gold)] hover:underline">
          ← Duty logs
        </Link>
        <h1 className="text-2xl font-bold text-[var(--navy)] mt-2">Create duty</h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          Assign a staff member to a duty form for a specific date.
        </p>
      </div>

      <AssignDutyForm
        templates={templates.map((t) => ({ id: t.id, name: t.name, type: t.type }))}
        staff={staff}
        defaultDate={format(new Date(), "yyyy-MM-dd")}
      />
    </div>
  );
}
