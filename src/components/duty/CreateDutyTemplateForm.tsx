"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createDutyTemplate } from "@/actions/duty.actions";
import {
  normalizeTemplateItemsForSave,
  type TemplateFormItemRow,
} from "@/lib/duty/template-form";
import type { DutyTemplateType, DutyTimeType } from "@prisma/client";

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
    <form onSubmit={handleSubmit} className="card p-6 space-y-6 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-[var(--navy)] mb-1">
          Form name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input w-full"
          placeholder="e.g. Evening Security Rounds"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--navy)] mb-1">
          Form type
        </label>
        <select
          value={type}
          onChange={(e) => setTemplateType(e.target.value as DutyTemplateType)}
          className="input w-full"
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
                  className="text-red-600 hover:text-red-700 p-0.5"
                  title="Remove task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <input
              value={item.description}
              onChange={(e) => updateItem(index, { description: e.target.value })}
              className="input w-full"
              placeholder="Task description"
              required
            />

            {type !== "CHECKLIST" && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--muted)] mb-1">When</label>
                  <select
                    value={item.timeType}
                    onChange={(e) =>
                      updateItem(index, {
                        timeType: e.target.value as DutyTimeType,
                        scheduledTime:
                          e.target.value === "SPECIFIC" ? item.scheduledTime || "06:00" : "",
                      })
                    }
                    className="input w-full"
                  >
                    <option value="SPECIFIC">Specific time</option>
                    <option value="END_OF_DAY">End of day</option>
                    <option value="CONTINUOUS">Continuous</option>
                  </select>
                </div>
                {item.timeType === "SPECIFIC" && (
                  <div>
                    <label className="block text-xs text-[var(--muted)] mb-1">Time (HH:MM)</label>
                    <input
                      type="time"
                      value={item.scheduledTime}
                      onChange={(e) =>
                        updateItem(index, { scheduledTime: e.target.value })
                      }
                      className="input w-full"
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
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Create form"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.push("/duty/templates")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
