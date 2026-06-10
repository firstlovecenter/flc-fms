"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { createMaintenanceRequest } from "@/actions/maintenance.actions";

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
    <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
      )}

      {/* Facility (optional) */}
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">
          Facility <span className="text-[var(--muted)] font-normal">(leave blank for general campus items)</span>
        </label>
        <select {...register("facilityId")} className="input">
          <option value="">— General / Non-facility asset —</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Issue Title *</label>
        <input {...register("title")} className="input" placeholder="e.g. AC Unit Not Working" />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Description *</label>
        <textarea {...register("description")} className="input" rows={4}
          placeholder="Describe the problem in detail: when it started, what you observed, any safety concerns…" />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Priority *</label>
          <select {...register("priority")} className="input">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Estimated Cost (GH₵)</label>
          <input {...register("estimatedCost")} type="number" step="0.01" className="input" placeholder="Optional" />
        </div>
      </div>

      {/* Scheduling toggle */}
      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        <button
          type="button"
          onClick={() => setHasSchedule((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[var(--slate)] bg-[var(--cream)] hover:bg-amber-50 transition-colors"
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
                <input {...register("scheduledStart")} type="datetime-local" className="input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--slate)] mb-1">End date &amp; time</label>
                <input {...register("scheduledEnd")} type="datetime-local" className="input" />
              </div>
            </div>
          </div>
        ) : (
          watchedFacilityId ? (
            <div className="px-4 py-3 bg-orange-50 border-t border-orange-100">
              <p className="text-xs text-orange-700">
                ⚠️ Without a schedule, this will <strong>immediately hard-lock</strong> the facility from all bookings.
              </p>
            </div>
          ) : null
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto">
          {isSubmitting ? "Submitting…" : "Submit Request"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary w-full sm:w-auto">Cancel</button>
      </div>
    </form>
  );
}
