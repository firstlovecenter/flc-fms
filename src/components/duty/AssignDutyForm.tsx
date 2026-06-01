"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { assignDuty } from "@/actions/duty.actions";

type Template = { id: string; name: string; type: string };
type Staff = { id: string; name: string };

export default function AssignDutyForm({
  templates,
  staff,
  defaultDate,
  onSuccess,
  embedded,
}: {
  templates: Template[];
  staff: Staff[];
  defaultDate: string;
  onSuccess?: () => void;
  /** When true, omit outer card styling (e.g. inside a dialog). */
  embedded?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [assignedToId, setAssignedToId] = useState(staff[0]?.id ?? "");
  const [date, setDate] = useState(defaultDate);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateId || !assignedToId) {
      toast.error("Select a template and staff member.");
      return;
    }

    startTransition(async () => {
      const res = await assignDuty({
        templateId,
        assignedToId,
        date,
      });
      if (!res.success) {
        toast.error(res.error ?? "Could not assign duty");
        return;
      }
      toast.success("Duty assigned");
      onSuccess?.();
      router.push(`/duty/${res.dutyLog.id}`);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={embedded ? "space-y-5" : "card p-6 space-y-5 max-w-lg"}
    >
      <div>
        <label className="block text-sm font-medium text-[var(--navy)] mb-1">
          Duty form
        </label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="input w-full"
          required
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--navy)] mb-1">
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input w-full"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--navy)] mb-1">
          Assigned to
        </label>
        <select
          value={assignedToId}
          onChange={(e) => setAssignedToId(e.target.value)}
          className="input w-full"
          required
        >
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Assigning…" : "Assign duty"}
        </button>
        {!embedded && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.back()}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
