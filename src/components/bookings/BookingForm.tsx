"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { createStaffBooking } from "@/actions/booking.actions";
import { getFacilityCategories } from "@/actions/availability.actions";
import { formatCurrency } from "@/lib/utils";
import { Clock } from "lucide-react";

const schema = z.object({
  facilityId:  z.string().min(1, "Please select a facility"),
  category:    z.string().min(1, "Please select a category"),
  title:       z.string().min(2, "Title is required"),
  description: z.string().optional(),
  startTime:   z.string().min(1, "Start time is required"),
  endTime:     z.string().min(1, "End time is required"),
  notes:       z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface TimeSlot {
  id:                   string;
  facilityId:           string;
  label:                string;
  dayOfWeek:            number;
  startTime:            string;
  endTime:              string;
  isFlexible:           boolean;
  isFree:               boolean;
  pricePerHourOverride: string | null;
  maxBookings:          number;
  category:             string | null;
}

interface Facility {
  id:           string;
  name:         string;
  pricePerHour: string | number;
  capacity:     number;
  timeSlots?:   TimeSlot[];
}

export default function BookingForm({
  facilities,
  defaultFacilityId,
}: {
  facilities:         Facility[];
  defaultFacilityId?: string;
}) {
  const router = useRouter();
  const [error, setError]               = useState<string | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<{ category: string; pricePerHour: number; description: string | null }[]>([]);

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { facilityId: defaultFacilityId ?? "" },
  });

  const facilityId = watch("facilityId");
  const startTime  = watch("startTime");
  const endTime    = watch("endTime");

  // Load configured categories when facility changes
  useEffect(() => {
    setCategoryOptions([]);
    if (facilityId) {
      getFacilityCategories(facilityId).then((res) => {
        if (res.success) setCategoryOptions(res.categories);
      });
    }
  }, [facilityId]);

  // Cost estimate
  useEffect(() => {
    if (facilityId && startTime && endTime) {
      const facility = facilities.find((f) => f.id === facilityId);
      if (!facility) return;
      const start = new Date(startTime);
      const end   = new Date(endTime);
      if (end > start) {
        const hours = (end.getTime() - start.getTime()) / 3_600_000;
        setEstimatedCost(Number(facility.pricePerHour) * hours);
      } else {
        setEstimatedCost(null);
      }
    }
  }, [facilityId, startTime, endTime, facilities]);

  // Derive available slots for the selected facility + day
  const availableSlots: TimeSlot[] = (() => {
    if (!facilityId) return [];
    const facility = facilities.find((f) => f.id === facilityId);
    if (!facility?.timeSlots?.length) return [];
    // If a date is chosen, filter by day of week
    if (startTime) {
      const dayOfWeek = new Date(startTime).getDay();
      return facility.timeSlots.filter((s) => s.dayOfWeek === dayOfWeek);
    }
    return facility.timeSlots;
  })();

  function applySlot(slot: TimeSlot) {
    setSelectedSlotId(slot.id);
    const datePart = startTime ? startTime.split("T")[0] : new Date().toISOString().split("T")[0];
    setValue("startTime", `${datePart}T${slot.startTime}`);
    setValue("endTime",   `${datePart}T${slot.endTime}`);
  }

  async function onSubmit(data: FormData) {
    setError(null);

    // Mondays are office off-days (Sabbath)
    if (new Date(data.startTime).getDay() === 1) {
      setError("Bookings cannot be made on Mondays. The office is closed on Mondays (Sabbath day).");
      return;
    }

    const result = await createStaffBooking({
      facilityId:  data.facilityId,
      category:    data.category as any,
      title:       data.title,
      description: data.description,
      startTime:   new Date(data.startTime),
      endTime:     new Date(data.endTime),
      notes:       data.notes,
    });

    if ("error" in result && result.error) {
      setError(result.error as string);
    } else {
      router.push("/bookings");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Facility *</label>
        <select {...register("facilityId")} className="input" onChange={(e) => { setSelectedSlotId(null); register("facilityId").onChange(e); }}>
          <option value="">Select a facility…</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} — {formatCurrency(Number(f.pricePerHour))}/hr · Cap: {f.capacity}
            </option>
          ))}
        </select>
        {errors.facilityId && <p className="text-red-500 text-xs mt-1">{errors.facilityId.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Category *</label>
        <select {...register("category")} className="input">
          <option value="">Select a category…</option>
          {categoryOptions.map((c) => (
            <option key={c.category} value={c.category}>
              {c.category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              {c.pricePerHour ? ` — ${formatCurrency(c.pricePerHour)}/hr` : ""}
            </option>
          ))}
        </select>
        {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Booking Title *</label>
        <input {...register("title")} className="input" placeholder="e.g. Sunday Service, Staff Meeting" />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Description</label>
        <textarea {...register("description")} className="input" rows={2} placeholder="Optional details…" />
      </div>

      {/* Date + slot picker */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Start Date & Time *</label>
            <input {...register("startTime")} type="datetime-local" className="input" />
            {errors.startTime && <p className="text-red-500 text-xs mt-1">{errors.startTime.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">End Date & Time *</label>
            <input {...register("endTime")} type="datetime-local" className="input" />
            {errors.endTime && <p className="text-red-500 text-xs mt-1">{errors.endTime.message}</p>}
          </div>
        </div>

        {/* Available slot chips */}
        {availableSlots.length > 0 && (
          <div>
            <p className="text-xs text-[var(--muted)] mb-1.5 flex items-center gap-1">
              <Clock size={12} /> Available time slots — click to apply
            </p>
            <div className="flex flex-wrap gap-2">
              {availableSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => applySlot(slot)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedSlotId === slot.id
                      ? "bg-[var(--navy)] text-white border-[var(--navy)]"
                      : "bg-[var(--cream)] text-[var(--slate)] border-[var(--border)] hover:border-[var(--navy)] hover:text-[var(--navy)]"
                  }`}
                >
                  {slot.label} · {slot.startTime}–{slot.endTime}
                  {slot.isFlexible && <span className="ml-1 opacity-75">(flex)</span>}
                  {slot.isFree
                    ? <span className="ml-1 text-green-600"> · Free</span>
                    : slot.pricePerHourOverride
                      ? <span className="ml-1"> · {formatCurrency(Number(slot.pricePerHourOverride))}/hr</span>
                      : null}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {estimatedCost !== null && (
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 text-sm">
          <span className="text-[var(--navy)]">Estimated cost: </span>
          <span className="font-bold text-[var(--navy)] text-base">{formatCurrency(estimatedCost)}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Notes</label>
        <textarea {...register("notes")} className="input" rows={2} placeholder="Special requirements…" />
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto">
          {isSubmitting ? "Creating…" : "Create Booking"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary w-full sm:w-auto">Cancel</button>
      </div>
    </form>
  );
}
