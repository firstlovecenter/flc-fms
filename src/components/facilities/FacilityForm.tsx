"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { createFacility, updateFacility } from "@/actions/facility.actions";
import MediaUploader from "@/components/ui/MediaUploader";

const schema = z.object({
  name:          z.string().min(2, "Name is required"),
  description:   z.string().optional(),
  capacity:      z.coerce.number().int().positive("Capacity must be positive"),
  pricePerHour:  z.coerce.number().positive("Price is required"),
  pricePerDay:   z.coerce.number().positive().optional().or(z.literal("")),
  availableFrom: z.string().default("08:00"),
  availableTo:   z.string().default("22:00"),
  amenities:     z.string().optional(), // comma-separated
  availableDays: z.array(z.coerce.number()).min(1, "Select at least one day"),
});

type FormData = z.infer<typeof schema>;

const DAYS = [
  { label: "Sun", value: 0 }, { label: "Mon", value: 1 }, { label: "Tue", value: 2 },
  { label: "Wed", value: 3 }, { label: "Thu", value: 4 }, { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

interface Props {
  facility?: {
    id: string; name: string; description: string | null;
    capacity: number; pricePerHour: unknown; pricePerDay: unknown;
    availableFrom: string; availableTo: string;
    amenities: string[]; availableDays: number[]; images: string[];
  };
}

export default function FacilityForm({ facility }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>(facility?.images || []);
  const isEdit = !!facility;

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: facility ? {
      name:          facility.name,
      description:   facility.description ?? "",
      capacity:      facility.capacity,
      pricePerHour:  Number(facility.pricePerHour),
      pricePerDay:   facility.pricePerDay ? Number(facility.pricePerDay) : undefined,
      availableFrom: facility.availableFrom,
      availableTo:   facility.availableTo,
      amenities:     facility.amenities.join(", "),
      availableDays: facility.availableDays,
    } : { availableDays: [0,1,2,3,4,5,6], availableFrom: "08:00", availableTo: "22:00" },
  });

  const selectedDays = watch("availableDays") ?? [];

  function toggleDay(day: number) {
    const current = selectedDays as number[];
    if (current.includes(day)) {
      setValue("availableDays", current.filter((d) => d !== day));
    } else {
      setValue("availableDays", [...current, day].sort());
    }
  }

  async function onSubmit(data: FormData) {
    setError(null);
    const amenities = data.amenities
      ? data.amenities.split(",").map((a) => a.trim()).filter(Boolean)
      : [];

    const payload = {
      name:          data.name,
      description:   data.description,
      capacity:      data.capacity,
      pricePerHour:  data.pricePerHour,
      pricePerDay:   data.pricePerDay || undefined,
      availableFrom: data.availableFrom,
      availableTo:   data.availableTo,
      amenities,
      images,
      availableDays: data.availableDays,
    };

    const result = isEdit
      ? await updateFacility(facility!.id, payload)
      : await createFacility(payload);

    if ("error" in result && result.error) {
      setError(result.error as string);
    } else {
      router.push("/facilities");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Facility Name *</label>
        <input {...register("name")} className="input" placeholder="Main Auditorium" />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Description</label>
        <textarea {...register("description")} className="input" rows={3} placeholder="Brief description…" />
      </div>

      {/* Capacity + Pricing */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Capacity *</label>
          <input {...register("capacity")} type="number" className="input" placeholder="500" />
          {errors.capacity && <p className="text-red-500 text-xs mt-1">{errors.capacity.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Price/Hour (GHS) *</label>
          <input {...register("pricePerHour")} type="number" step="0.01" className="input" placeholder="150.00" />
          {errors.pricePerHour && <p className="text-red-500 text-xs mt-1">{errors.pricePerHour.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Price/Day (GHS)</label>
          <input {...register("pricePerDay")} type="number" step="0.01" className="input" placeholder="800.00" />
        </div>
      </div>

      {/* Available hours */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Available From</label>
          <input {...register("availableFrom")} type="time" className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Available To</label>
          <input {...register("availableTo")} type="time" className="input" />
        </div>
      </div>

      {/* Available days */}
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-2">Available Days *</label>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleDay(value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                selectedDays.includes(value)
                  ? "bg-[var(--navy)] text-white border-brand-500"
                  : "bg-white text-[var(--slate)] border-gray-300 hover:bg-[var(--cream)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {errors.availableDays && <p className="text-red-500 text-xs mt-1">{errors.availableDays.message}</p>}
      </div>

      {/* Amenities */}
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Amenities (comma-separated)</label>
        <input {...register("amenities")} className="input" placeholder="AC, Projector, Sound System, Whiteboard" />
      </div>

      {/* Images */}
      <MediaUploader
        mediaType="facility"
        mediaId={facility?.id}
        images={images}
        onImagesChange={setImages}
        max={4}
        label="Facility Images"
        showMain
      />

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto">
          {isSubmitting ? "Saving…" : isEdit ? "Update Facility" : "Create Facility"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary w-full sm:w-auto">
          Cancel
        </button>
      </div>
    </form>
  );
}
