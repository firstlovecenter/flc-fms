"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createDutyTemplate } from "@/actions/duty.actions";
import { Button } from "@/components/ui/button";
import { Input, inputStyles } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  normalizeTemplateItemsForSave,
  type TemplateFormItemRow,
} from "@/lib/duty/template-form";
import type { DutyTemplateType, DutyTimeType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type ItemRow = TemplateFormItemRow;

const TYPE_LABELS: Record<DutyTemplateType, string> = {
  TIMED_LOG: "Timed log (Time | Task | Done | Signature)",
  END_OF_SHIFT: "End-of-shift log (Sunday man on duty)",
  CHECKLIST: "Checklist (no times, vicar sign-off)",
};

function defaultItem(type: DutyTemplateType): ItemRow {
  if (type === "END_OF_SHIFT") {
    return { description: "", timeType: "SPECIFIC", scheduledTime: "23:00" };
  }
  if (type === "CHECKLIST") {
    return { description: "", timeType: "SPECIFIC", scheduledTime: "" };
  }
  return { description: "", timeType: "SPECIFIC", scheduledTime: "06:00" };
}

export default function CreateDutyTemplateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [type, setType] = useState<DutyTemplateType>("TIMED_LOG");
  const [items, setItems] = useState<ItemRow[]>([defaultItem("TIMED_LOG")]);

  function setTemplateType(next: DutyTemplateType) {
    setType(next);
    setItems([defaultItem(next)]);
  }

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function addItem() {
    setItems((rows) => [...rows, defaultItem(type)]);
  }

  function removeItem(index: number) {
    setItems((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter a form name.");
      return;
    }

    startTransition(async () => {
      const res = await createDutyTemplate({
        name: name.trim(),
        type,
        items: normalizeTemplateItemsForSave(type, items),
      });

      if (!res.success) {
        toast.error(res.error ?? "Could not create form");
        return;
      }

      toast.success("Duty form created");
      router.push("/duty/templates");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} ><Card className="p-6 space-y-6 max-w-2xl">
      <div>
        <Label htmlFor="duty-template-name" className="text-[var(--navy)] mb-1">
          Form name
        </Label>
        <Input
          id="duty-template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Evening Security Rounds"
          required
        />
      </div>

      <div>
        <Label htmlFor="duty-template-type" className="text-[var(--navy)] mb-1">
          Form type
        </Label>
        <select
          id="duty-template-type"
          value={type}
          onChange={(e) => setTemplateType(e.target.value as DutyTemplateType)}
          className={cn(inputStyles)}
        >
          {(Object.keys(TYPE_LABELS) as DutyTemplateType[]).map((key) => (
            <option key={key} value={key}>
              {TYPE_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[var(--navy)]">Tasks</label>
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-[var(--gold)] hover:underline inline-flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add task
          </button>
        </div>

        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-lg border border-[var(--border)] p-4 space-y-3 bg-[var(--cream-dark)]"
          >
            <div className="flex justify-between gap-2">
              <span className="text-xs font-medium text-[var(--muted)]">
                Task {index + 1}
              </span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-danger hover:text-danger/80 p-0.5"
                  title="Remove task"
                  aria-label="Remove task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <Input
              value={item.description}
              onChange={(e) => updateItem(index, { description: e.target.value })}
              placeholder="Task description"
              required
            />

            {type !== "CHECKLIST" && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`duty-task-${index}-when`} className="text-xs text-[var(--muted)] mb-1">When</Label>
                  <select
                    id={`duty-task-${index}-when`}
                    value={item.timeType}
                    onChange={(e) =>
                      updateItem(index, {
                        timeType: e.target.value as DutyTimeType,
                        scheduledTime:
                          e.target.value === "SPECIFIC" ? item.scheduledTime || "06:00" : "",
                      })
                    }
                    className={cn(inputStyles)}
                  >
                    <option value="SPECIFIC">Specific time</option>
                    <option value="END_OF_DAY">End of day</option>
                    <option value="CONTINUOUS">Continuous</option>
                  </select>
                </div>
                {item.timeType === "SPECIFIC" && (
                  <div>
                    <Label htmlFor={`duty-task-${index}-time`} className="text-xs text-[var(--muted)] mb-1">Time (HH:MM)</Label>
                    <Input
                      id={`duty-task-${index}-time`}
                      type="time"
                      value={item.scheduledTime}
                      onChange={(e) =>
                        updateItem(index, { scheduledTime: e.target.value })
                      }
                      required
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Create form"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/duty/templates")}
        >
          Cancel
        </Button>
      </div>
    </Card></form>
  );
}
