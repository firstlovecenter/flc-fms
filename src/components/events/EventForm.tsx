"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { createEvent } from "@/actions/event.actions";

const schema = z.object({
  facilityId:   z.string().min(1, "Please select a facility"),
  title:        z.string().min(2, "Title required"),
  description:  z.string().optional(),
  startTime:    z.string().min(1, "Required"),
  endTime:      z.string().min(1, "Required"),
  maxAttendees: z.coerce.number().int().positive().optional().or(z.literal("")),
  isPublic:     z.boolean().default(true),
  isRecurring:  z.boolean().default(false),
});
type FormData = z.infer<typeof schema>;

interface Facility { id: string; name: string; capacity: number; }

export default function EventForm({ facilities }: { facilities: Facility[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isPublic: true, isRecurring: false },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const result = await createEvent({
      facilityId:   data.facilityId,
      title:        data.title,
      description:  data.description,
      startTime:    new Date(data.startTime),
      endTime:      new Date(data.endTime),
      maxAttendees: data.maxAttendees ? Number(data.maxAttendees) : undefined,
      isPublic:     data.isPublic,
      isRecurring:  data.isRecurring,
    });
    if ("error" in result && result.error) { setError(result.error as string); return; }
    router.push("/events");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Facility *</label>
        <select {...register("facilityId")} className="input">
          <option value="">Choose a facility…</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>{f.name} (cap. {f.capacity.toLocaleString()})</option>
          ))}
        </select>
        {errors.facilityId && <p className="text-red-500 text-xs mt-1">{errors.facilityId.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Event Title *</label>
        <input {...register("title")} className="input" placeholder="e.g. Sunday Worship Service, Youth Conference" />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Description</label>
        <textarea {...register("description")} className="input" rows={3}
          placeholder="Describe the event…" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Start *</label>
          <input {...register("startTime")} type="datetime-local" className="input" />
          {errors.startTime && <p className="text-red-500 text-xs mt-1">{errors.startTime.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">End *</label>
          <input {...register("endTime")} type="datetime-local" className="input" />
          {errors.endTime && <p className="text-red-500 text-xs mt-1">{errors.endTime.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Max Attendees</label>
        <input {...register("maxAttendees")} type="number" className="input" placeholder="Leave blank for unlimited" />
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input {...register("isPublic")} type="checkbox" className="w-4 h-4 rounded accent-brand-500" />
          <span className="text-sm text-[var(--slate)]">Public event (visible to patrons)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input {...register("isRecurring")} type="checkbox" className="w-4 h-4 rounded accent-brand-500" />
          <span className="text-sm text-[var(--slate)]">Recurring</span>
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? "Creating…" : "Create Event"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
