"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { assignDuty } from "@/actions/duty.actions";
import { Button } from "@/components/ui/button";
import { Input, inputStyles } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

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

  const FormShell = embedded ? "div" : Card;

  return (
    <form onSubmit={handleSubmit}>
      <FormShell className={embedded ? "space-y-5" : "p-6 space-y-5 max-w-lg"}>
      <div>
        <Label htmlFor="assign-duty-template">Duty form</Label>
        <select
          id="assign-duty-template"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className={cn(inputStyles)}
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
        <Label htmlFor="assign-duty-date">Date</Label>
        <Input
          id="assign-duty-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="assign-duty-staff">Assigned to</Label>
        <select
          id="assign-duty-staff"
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
          {pending ? "Assigning…" : "Assign duty"}
        </Button>
        {!embedded && (
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        )}
      </div>
      </FormShell>
    </form>
  );
}
