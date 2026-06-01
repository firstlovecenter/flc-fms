import Link from "next/link";
import { format } from "date-fns";
import { requireStaff } from "@/lib/auth/guards";
import {
  getActiveStaffForDuty,
  getDutyLogsForDate,
  getDutyTemplates,
} from "@/lib/duty/queries";
import { serializeDutyLog } from "@/components/duty/types";
import DutyLogListClient from "@/components/duty/DutyLogListClient";
import CreateDutyDialog from "@/components/duty/CreateDutyDialog";

export const metadata = { title: "Duty Logs" };

export default async function DutyPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const session = await requireStaff();
  const canManage =
    session.role === "FACILITY_MANAGER" || session.role === "SUPER_ADMIN";

  const dateParam = searchParams.date;
  const selectedDate = dateParam
    ? new Date(dateParam + "T12:00:00")
    : new Date();
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const logs = await getDutyLogsForDate(
    selectedDate,
    canManage ? undefined : { assignedToId: session.sub },
  );

  const [templates, staff] = canManage
    ? await Promise.all([getDutyTemplates(), getActiveStaffForDuty()])
    : [[], []];

  const serialized = logs.map(serializeDutyLog);

  const active = serialized.filter((l) => l.status === "ACTIVE").length;
  const signedOff = serialized.filter((l) => l.status === "SIGNED_OFF").length;

  const templateOptions = templates.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
  }));
  const staffOptions = staff.map((s) => ({ id: s.id, name: s.name }));
  const canCreate =
    canManage && templateOptions.length > 0 && staffOptions.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {canManage ? "Duty Logs" : "My Duties"}
            </h1>
            <p className="page-hero-muted mt-1 text-sm">
              {canManage
                ? "Assign and review duty forms for staff on duty."
                : "Your assigned duty forms — open one to complete tasks and sign off."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/duty/display"
              target="_blank"
              rel="noopener noreferrer"
              className="page-hero-btn"
            >
              Office display
            </a>
            {canManage && (
              <>
                <Link href="/duty/templates" className="page-hero-btn">
                  Manage forms
                </Link>
                {canCreate && (
                  <CreateDutyDialog
                    templates={templateOptions}
                    staff={staffOptions}
                    defaultDate={dateStr}
                    triggerClassName="page-hero-btn page-hero-btn-primary"
                  />
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex gap-6 mt-4 text-sm page-hero-stat page-hero-muted">
          <span>
            <strong>{serialized.length}</strong>{" "}
            {canManage ? "logs" : "assignments"}
          </span>
          <span>
            <strong>{active}</strong> in progress
          </span>
          <span>
            <strong>{signedOff}</strong> signed off
          </span>
        </div>
      </div>

      {canManage && !canCreate && templateOptions.length === 0 && (
        <div className="card p-4 text-sm text-[var(--muted)]">
          No duty forms available.{" "}
          <Link href="/duty/templates/new" className="text-[var(--gold)] hover:underline">
            Create a duty form
          </Link>
        </div>
      )}

      <DutyLogListClient
        logs={serialized}
        selectedDate={dateStr}
        canManage={canManage}
      />
    </div>
  );
}
