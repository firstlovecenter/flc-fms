"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { createMaintenanceRequest } from "@/actions/maintenance.actions";
import { Button } from "@/components/ui/button";
import { Input, inputStyles } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const schema = z.object({
  facilityId:     z.string().optional(),
  title:          z.string().min(2, "Title is required"),
  description:    z.string().min(5, "Please describe the issue"),
  priority:       z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  scheduledStart: z.string().optional(),
  scheduledEnd:   z.string().optional(),
  estimatedCost:  z.coerce.number().positive().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export default function MaintenanceForm({
  facilities,
  initialTitle,
  taskId,
}: {
  facilities: { id: string; name: string }[];
  initialTitle?: string;
  taskId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [hasSchedule, setHasSchedule] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "MEDIUM", title: initialTitle ?? "" },
  });

  const watchedFacilityId = watch("facilityId");

  async function onSubmit(data: FormData) {
    setError(null);
    const result = await createMaintenanceRequest({
      taskId:         taskId || undefined,
      facilityId:     data.facilityId || undefined,
      title:          data.title,
      description:    data.description,
      priority:       data.priority,
      scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : undefined,
      scheduledEnd:   data.scheduledEnd   ? new Date(data.scheduledEnd)   : undefined,
      estimatedCost:  data.estimatedCost ? Number(data.estimatedCost) : undefined,
    });

    if ("error" in result && result.error) {
      setError(result.error as string);
    } else {
      router.push("/maintenance");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} ><Card className="p-6 space-y-5">
      {error && (
        <div className="bg-danger/10 border border-danger/25 rounded-lg p-3 text-danger text-sm">{error}</div>
      )}

      {/* Facility (optional) */}
      <div>
        <Label htmlFor="maintenance-facility">
          Facility <span className="text-[var(--muted)] font-normal">(leave blank for general campus items)</span>
        </Label>
        <select id="maintenance-facility" {...register("facilityId")} className={cn(inputStyles)}>
          <option value="">— General / Non-facility asset —</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="maintenance-title">Issue Title *</Label>
        <Input id="maintenance-title" {...register("title")} placeholder="e.g. AC Unit Not Working" />
        {errors.title && <p className="text-danger text-xs mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="maintenance-description">Description *</Label>
        <Textarea id="maintenance-description" {...register("description")} rows={4}
          placeholder="Describe the problem in detail: when it started, what you observed, any safety concerns…" />
        {errors.description && <p className="text-danger text-xs mt-1">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="maintenance-priority">Priority *</Label>
          <select id="maintenance-priority" {...register("priority")} className={cn(inputStyles)}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <div>
          <Label htmlFor="maintenance-cost">Estimated Cost (GH₵)</Label>
          <Input id="maintenance-cost" {...register("estimatedCost")} type="text" inputMode="decimal" placeholder="Optional" />
        </div>
      </div>

      {/* Scheduling toggle */}
      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        <button
          type="button"
          onClick={() => setHasSchedule((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[var(--slate)] bg-[var(--cream)] hover:bg-warning/10 transition-colors"
        >
          <span>📅 Schedule maintenance window <span className="text-[var(--muted)] font-normal">(optional)</span></span>
          <span className="text-xs">{hasSchedule ? "▲" : "▼"}</span>
        </button>

        {hasSchedule ? (
          <div className="p-4 space-y-3">
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              When a window is set, the facility stays bookable <strong>outside</strong> these dates.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--slate)] mb-1">Start date &amp; time</label>
                <Input {...register("scheduledStart")} type="datetime-local" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--slate)] mb-1">End date &amp; time</label>
                <Input {...register("scheduledEnd")} type="datetime-local" />
              </div>
            </div>
          </div>
        ) : (
          watchedFacilityId ? (
            <div className="px-4 py-3 bg-maintenance/10 border-t border-maintenance/25">
              <p className="text-xs text-maintenance">
                ⚠️ Without a schedule, this will <strong>immediately hard-lock</strong> the facility from all bookings.
              </p>
            </div>
          ) : null
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? "Submitting…" : "Submit Request"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">Cancel</Button>
      </div>
    </Card></form>
  );
}
