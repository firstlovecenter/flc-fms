"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { createEvent } from "@/actions/event.actions";
import { Button } from "@/components/ui/button";
import { Input, inputStyles } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

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
    <form onSubmit={handleSubmit(onSubmit)} ><Card className="p-6 space-y-5">
      {error && (
        <div className="bg-danger/10 border border-danger/25 rounded-lg p-3 text-danger text-sm">{error}</div>
      )}

      <div>
        <Label htmlFor="event-facility">Facility *</Label>
        <select id="event-facility" {...register("facilityId")} className={cn(inputStyles)}>
          <option value="">Choose a facility…</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>{f.name} (cap. {f.capacity.toLocaleString()})</option>
          ))}
        </select>
        {errors.facilityId && <p className="text-danger text-xs mt-1">{errors.facilityId.message}</p>}
      </div>

      <div>
        <Label htmlFor="event-title">Event Title *</Label>
        <Input id="event-title" {...register("title")} placeholder="e.g. Sunday Worship Service, Youth Conference" />
        {errors.title && <p className="text-danger text-xs mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="event-description">Description</Label>
        <Textarea id="event-description" {...register("description")} rows={3}
          placeholder="Describe the event…" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="event-start">Start *</Label>
          <Input id="event-start" {...register("startTime")} type="datetime-local" />
          {errors.startTime && <p className="text-danger text-xs mt-1">{errors.startTime.message}</p>}
        </div>
        <div>
          <Label htmlFor="event-end">End *</Label>
          <Input id="event-end" {...register("endTime")} type="datetime-local" />
          {errors.endTime && <p className="text-danger text-xs mt-1">{errors.endTime.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="event-max-attendees">Max Attendees</Label>
        <Input id="event-max-attendees" {...register("maxAttendees")} type="number" placeholder="Leave blank for unlimited" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input {...register("isPublic")} type="checkbox" className="w-4 h-4 rounded accent-gold" />
          <span className="text-sm text-[var(--slate)]">Public event (visible to patrons)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input {...register("isRecurring")} type="checkbox" className="w-4 h-4 rounded accent-gold" />
          <span className="text-sm text-[var(--slate)]">Recurring</span>
        </label>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? "Creating…" : "Create Event"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">Cancel</Button>
      </div>
    </Card></form>
  );
}
