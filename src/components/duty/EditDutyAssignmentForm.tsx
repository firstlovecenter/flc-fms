"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateDutyAssignment } from "@/actions/duty.actions";
import { Button } from "@/components/ui/button";
import { Input, inputStyles } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

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
    <form onSubmit={handleSubmit} ><Card className="p-6 space-y-5 max-w-lg">
      <p className="text-sm text-[var(--muted)]">
        Form: <strong className="text-[var(--navy)]">{formName}</strong> (cannot be changed)
      </p>

      <div>
        <Label htmlFor="edit-duty-assignment-date">Date</Label>
        <Input
          id="edit-duty-assignment-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="edit-duty-assignment-staff">Assigned to</Label>
        <select
          id="edit-duty-assignment-staff"
          value={assignedToId}
          onChange={(e) => setAssignedToId(e.target.value)}
          className={cn(inputStyles)}
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
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </Card></form>
  );
}
