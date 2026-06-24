import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePerm } from "@/lib/auth/guards";
import { getAllDutyTemplates } from "@/lib/duty/queries";
import { buttonVariants } from "@/components/ui/button-variants";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";
import DutyTemplateRowActions from "@/components/duty/DutyTemplateRowActions";

import { Card } from "@/components/ui/card";

export const metadata = { title: "Duty Forms" };

const TYPE_LABELS: Record<string, string> = {
  TIMED_LOG: "Timed log",
  END_OF_SHIFT: "End of shift",
  CHECKLIST: "Checklist",
};

export default async function DutyTemplatesPage() {
  await requirePerm("duty:manage");

  const templates = await getAllDutyTemplates();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Link href="/duty" className="text-sm text-[var(--gold)] hover:underline">
          ← Duty logs
        </Link>
        <PageHeader
          variant="hero"
          title="Duty forms"
          description="Reusable checklists and logs used when assigning duties."
          actions={
            <Link href="/duty/templates/new" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
              <Plus className="h-4 w-4" />
              New form
            </Link>
          }
        />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--cream-dark)]">
              <th className="text-left px-4 py-3 font-semibold text-[var(--navy)]">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-[var(--navy)]">Type</th>
              <th className="text-left px-4 py-3 font-semibold text-[var(--navy)]">Tasks</th>
              <th className="text-left px-4 py-3 font-semibold text-[var(--navy)]">Used</th>
              <th className="text-left px-4 py-3 font-semibold text-[var(--navy)]">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {templates.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[var(--muted)]">
                  No forms yet.{" "}
                  <Link href="/duty/templates/new" className="text-[var(--gold)] hover:underline">
                    Create one
                  </Link>
                </td>
              </tr>
            ) : (
              templates.map((t) => (
                <tr key={t.id} className="hover:bg-[var(--cream-dark)]/80">
                  <td className="px-4 py-3 font-medium text-[var(--navy)]">
                    <Link
                      href={`/duty/templates/${t.id}/edit`}
                      className="hover:text-[var(--gold)]"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {TYPE_LABELS[t.type] ?? t.type}
                  </td>
                  <td className="px-4 py-3">{t._count.items}</td>
                  <td className="px-4 py-3">{t._count.dutyLogs}</td>
                  <td className="px-4 py-3">
                    {t.isActive ? (
                      <StatusBadge status="APPROVED" label="Active" size="xs" />
                    ) : (
                      <StatusBadge status="CANCELLED" label="Inactive" size="xs" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/duty/templates/${t.id}/edit`}
                        className="text-xs text-[var(--gold)] hover:underline"
                      >
                        Edit
                      </Link>
                      <DutyTemplateRowActions
                        templateId={t.id}
                        name={t.name}
                        isActive={t.isActive}
                        assignmentCount={t._count.dutyLogs}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
