"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateDutyAssignment } from "@/actions/duty.actions";

export default function EditDutyAssignmentForm({
  dutyLogId,
  staff,
  defaultDate,
  defaultAssignedToId,
  formName,
}: {
  dutyLogId: string;
  staff: { id: string; name: string }[];
  defaultDate: string;
  defaultAssignedToId: string;
  formName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [assignedToId, setAssignedToId] = useState(defaultAssignedToId);
  const [date, setDate] = useState(defaultDate);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateDutyAssignment(dutyLogId, {
        assignedToId,
        date,
      });
      if (!res.success) {
        toast.error(res.error ?? "Could not update assignment");
        return;
      }
      toast.success("Assignment updated");
      router.push(`/duty/${dutyLogId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5 max-w-lg">
      <p className="text-sm text-[var(--muted)]">
        Form: <strong className="text-[var(--navy)]">{formName}</strong> (cannot be changed)
      </p>

      <div>
        <label className="block text-sm font-medium text-[var(--navy)] mb-1">Date</label>
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
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.back()}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
