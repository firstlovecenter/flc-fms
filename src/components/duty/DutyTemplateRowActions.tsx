"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import {
  deleteDutyTemplate,
  setDutyTemplateActive,
} from "@/actions/duty.actions";

export default function DutyTemplateRowActions({
  templateId,
  name,
  isActive,
  assignmentCount,
}: {
  templateId: string;
  name: string;
  isActive: boolean;
  assignmentCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggleActive() {
    startTransition(async () => {
      const res = await setDutyTemplateActive(templateId, !isActive);
      if (!res.success) {
        toast.error(res.error ?? "Could not update form");
        return;
      }
      toast.success(isActive ? "Form deactivated" : "Form activated");
      router.refresh();
    });
  }

  function handleDelete() {
    if (assignmentCount > 0) {
      toast.error("Deactivate this form instead — it has existing assignments.");
      return;
    }
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteDutyTemplate(templateId);
      if (!res.success) {
        toast.error(res.error ?? "Could not delete");
        return;
      }
      toast.success("Form deleted");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/duty/templates/${templateId}/edit`}
        className="p-1.5 text-[var(--muted)] hover:text-[var(--navy)] rounded"
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={handleToggleActive}
        className="p-1.5 text-[var(--muted)] hover:text-[var(--navy)] rounded"
        title={isActive ? "Deactivate" : "Activate"}
      >
        {isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={handleDelete}
        className="p-1.5 text-red-600 hover:text-red-700 dark:text-red-400 rounded"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
