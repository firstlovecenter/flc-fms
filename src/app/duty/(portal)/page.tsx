import Link from "next/link";
import { requirePerm } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import PageHeader from "@/components/layout/PageHeader";
import {
  dutyDateFromInput,
  formatDutyDateInput,
  toDutyDateOnly,
} from "@/lib/duty/dates";
import {
  getActiveStaffForDuty,
  getDutyLogsForDate,
  getDutyTemplates,
} from "@/lib/duty/queries";
import { serializeDutyLog } from "@/components/duty/types";
import DutyLogListClient from "@/components/duty/DutyLogListClient";
import CreateDutyDialog from "@/components/duty/CreateDutyDialog";

import { Card } from "@/components/ui/card";

export const metadata = { title: "Duty Logs" };

export default async function DutyPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const session = await requirePerm("duty:view");
  const canManage = session.role === "SUPER_ADMIN" || (session.authContext?.permissions["duty:manage"] ?? false);

  const dateParam = searchParams.date;
  const selectedDate = dateParam
    ? dutyDateFromInput(dateParam)
    : toDutyDateOnly(new Date());
  const dateStr = dateParam ?? formatDutyDateInput(selectedDate);

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

  const heroBtnOutline = buttonVariants({ variant: "heroOutline", size: "sm" });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        variant="hero"
        title={canManage ? "Duty Logs" : "My Duties"}
        description={
          <>
            <p>
              {canManage
                ? "Assign and review duty forms for staff on duty."
                : "Your assigned duty forms — open one to complete tasks and sign off."}
            </p>
            <div className="flex gap-6 mt-4 text-sm text-[var(--page-hero-muted)]">
              <span>
                <strong className="text-[var(--page-hero-fg)]">{serialized.length}</strong>{" "}
                {canManage ? "logs" : "assignments"}
              </span>
              <span>
                <strong className="text-[var(--page-hero-fg)]">{active}</strong> in progress
              </span>
              <span>
                <strong className="text-[var(--page-hero-fg)]">{signedOff}</strong> signed off
              </span>
            </div>
          </>
        }
        actions={
          <>
            <a
              href="/duty/display"
              target="_blank"
              rel="noopener noreferrer"
              className={heroBtnOutline}
            >
              Office display
            </a>
            {canManage && (
              <>
                <Link href="/duty/templates" className={heroBtnOutline}>
                  Manage forms
                </Link>
                {canCreate && (
                  <CreateDutyDialog
                    templates={templateOptions}
                    staff={staffOptions}
                    defaultDate={dateStr}
                    triggerVariant="hero"
                  />
                )}
              </>
            )}
          </>
        }
      />

      {canManage && !canCreate && templateOptions.length === 0 && (
        <Card className="p-4 text-sm text-[var(--muted)]">
          No duty forms available.{" "}
          <Link href="/duty/templates/new" className="text-[var(--gold)] hover:underline">
            Create a duty form
          </Link>
        </Card>
      )}

      <DutyLogListClient
        logs={serialized}
        selectedDate={dateStr}
        canManage={canManage}
      />
    </div>
  );
}
