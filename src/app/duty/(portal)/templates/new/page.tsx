import Link from "next/link";
import { requirePerm } from "@/lib/auth/guards";
import CreateDutyTemplateForm from "@/components/duty/CreateDutyTemplateForm";

export const metadata = { title: "New Duty Form" };

export default async function NewDutyTemplatePage() {
  await requirePerm("duty:manage");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link href="/duty/templates" className="text-sm text-[var(--gold)] hover:underline">
          ← Duty forms
        </Link>
        <h1 className="text-2xl font-bold text-[var(--navy)] mt-2">New duty form</h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          Define a reusable checklist or timed log. Staff will pick this when creating a duty.
        </p>
      </div>

      <CreateDutyTemplateForm />
    </div>
  );
}
