import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { getDutyTemplateById } from "@/lib/duty/queries";
import EditDutyTemplateForm from "@/components/duty/EditDutyTemplateForm";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const template = await getDutyTemplateById(params.id);
  return { title: template ? `Edit ${template.name}` : "Edit duty form" };
}

export default async function EditDutyTemplatePage({
  params,
}: {
  params: { id: string };
}) {
  await requireStaff("FACILITY_MANAGER", "SUPER_ADMIN");

  const template = await getDutyTemplateById(params.id);
  if (!template) notFound();

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <Link href="/duty/templates" className="text-sm text-[var(--gold)] hover:underline">
          ← Duty forms
        </Link>
        <h1 className="text-2xl font-bold text-[var(--navy)] mt-2">Edit duty form</h1>
      </div>

      <EditDutyTemplateForm
        templateId={template.id}
        initialName={template.name}
        initialType={template.type}
        initialItems={template.items}
        assignmentCount={template._count.dutyLogs}
      />
    </div>
  );
}
