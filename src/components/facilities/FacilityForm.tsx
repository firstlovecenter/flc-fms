"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { createFacility, updateFacility } from "@/actions/facility.actions";
import MediaUploader from "@/components/ui/MediaUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

const schema = z.object({
  name:          z.string().min(2, "Name is required"),
  description:   z.string().optional(),
  capacity:      z.coerce.number().int().positive("Capacity must be positive"),
  acUsageFee:    z.coerce.number().min(0, "AC usage fee cannot be negative"),
  requiresBookingTerms: z.boolean().default(true),
  requiresItemBookingTerms: z.boolean().default(false),
  hasAccessCode: z.boolean().default(false),
  accessCode:    z.string().optional(),
  amenities:     z.string().optional(), // comma-separated
  availableDays: z.array(z.coerce.number()).min(1, "Select at least one day"),
  latitude:      z.string().optional(),
  longitude:     z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const DAYS = [
  { label: "Sun", value: 0 }, { label: "Mon", value: 1 }, { label: "Tue", value: 2 },
  { label: "Wed", value: 3 }, { label: "Thu", value: 4 }, { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

interface Props {
  categories: { slug: string; name: string }[];
  facility?: {
    id: string; name: string; description: string | null;
    capacity: number;
    acUsageFee: number;
    requiresBookingTerms: boolean;
    requiresItemBookingTerms: boolean;
    hasAccessCode: boolean;
    accessCode: string | null;
    amenities: string[]; availableDays: number[]; images: string[];
    latitude?: number | null;
    longitude?: number | null;
    pricing?: {
      category: string;
      price: number;
      freeDays: number[];
      description: string | null;
      isActive: boolean;
    }[];
  };
}

type CategoryMappingDraft = {
  enabled: boolean;
  category: string;
  price: string;
  freeDays: string;
  description: string;
};

export default function FacilityForm({ facility, categories }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>(facility?.images || []);
  const isEdit = !!facility;
  const [categoryMappings, setCategoryMappings] = useState<CategoryMappingDraft[]>(() => {
    const existing = new Map(
      (facility?.pricing ?? []).map((p) => [p.category, p])
    );

    return categories.map((c) => {
      const mapped = existing.get(c.slug);
      return {
        enabled: !!mapped?.isActive,
        category: c.slug,
        price: mapped?.price != null ? String(mapped.price) : "",
        freeDays: mapped?.freeDays?.length ? mapped.freeDays.join(",") : "",
        description: mapped?.description ?? "",
      };
    });
  });

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: facility ? {
      name:          facility.name,
      description:   facility.description ?? "",
      capacity:      facility.capacity,
      acUsageFee:    facility.acUsageFee,
      requiresBookingTerms: facility.requiresBookingTerms,
      requiresItemBookingTerms: facility.requiresItemBookingTerms,
      hasAccessCode: facility.hasAccessCode,
      accessCode:    facility.accessCode ?? "",
      amenities:     facility.amenities.join(", "),
      availableDays: facility.availableDays,
      latitude:      facility.latitude != null ? String(facility.latitude) : "",
      longitude:     facility.longitude != null ? String(facility.longitude) : "",
    } : {
      availableDays: [0,1,2,3,4,5,6],
      acUsageFee: 0,
      requiresBookingTerms: true,
      requiresItemBookingTerms: false,
      hasAccessCode: false,
      accessCode: "",
    },
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
    const activeMappings = categoryMappings
      .filter((m) => m.enabled)
      .map((m) => ({
        category: m.category,
        price: Number(m.price),
        freeDays: m.freeDays
          .split(",")
          .map((d) => Number(d.trim()))
          .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        description: m.description.trim() || null,
        isActive: true,
      }))
      .filter((m) => Number.isFinite(m.price) && m.price > 0);

    if (activeMappings.length === 0) {
      setError("Select at least one category and provide its price.");
      return;
    }

    const amenities = data.amenities
      ? data.amenities.split(",").map((a) => a.trim()).filter(Boolean)
      : [];

    const payload = {
      name:          data.name,
      description:   data.description,
      capacity:      data.capacity,
      acUsageFee:    data.acUsageFee,
      requiresBookingTerms: data.requiresBookingTerms,
      requiresItemBookingTerms: data.requiresItemBookingTerms,
      hasAccessCode: data.hasAccessCode,
      accessCode:    data.hasAccessCode ? (data.accessCode?.trim() || null) : null,
      amenities,
      images,
      availableDays: data.availableDays,
      latitude:      data.latitude ? Number(data.latitude) : null,
      longitude:     data.longitude ? Number(data.longitude) : null,
      categoryMappings: activeMappings,
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

  function updateMapping(category: string, patch: Partial<CategoryMappingDraft>) {
    setCategoryMappings((prev) => prev.map((m) => (m.category === category ? { ...m, ...patch } : m)));
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} ><Card className="p-6 space-y-5">
      {error && (
        <div className="bg-danger/10 border border-danger/25 rounded-lg p-3 text-danger text-sm">{error}</div>
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Facility Name *</label>
        <Input {...register("name")} placeholder="Main Auditorium" />
        {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Description</label>
        <Textarea {...register("description")} rows={3} placeholder="Brief description…" />
      </div>

      {/* Capacity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Capacity *</label>
          <Input {...register("capacity")} type="number" placeholder="500" />
          {errors.capacity && <p className="text-danger text-xs mt-1">{errors.capacity.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">AC Usage Fee (Optional Add-on)</label>
          <Input {...register("acUsageFee")} type="number" min="0" step="0.01" placeholder="0" />
          {errors.acUsageFee && <p className="text-danger text-xs mt-1">{errors.acUsageFee.message}</p>}
          <p className="text-xs text-[var(--muted)] mt-1">Applied only when a booker selects air conditioner usage.</p>
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
                  ? "bg-[var(--navy)] text-white border-gold"
                  : "bg-white text-[var(--slate)] border-gray-300 hover:bg-[var(--cream)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {errors.availableDays && <p className="text-danger text-xs mt-1">{errors.availableDays.message}</p>}
      </div>

      {/* Amenities */}
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Amenities (comma-separated)</label>
        <Input {...register("amenities")} placeholder="AC, Projector, Sound System, Whiteboard" />
      </div>

      {/* GPS Coordinates for check-in verification */}
      <div className="space-y-2 rounded-xl border border-[var(--border)] bg-white p-4">
        <h3 className="text-sm font-semibold text-[var(--slate)] uppercase tracking-wide">GPS Location</h3>
        <p className="text-xs text-[var(--muted)]">Used for geolocation-based check-in verification. Patrons must be within 500m of the facility to request check-in.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Latitude</label>
            <Input {...register("latitude")} type="number" step="any" placeholder="5.6037" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Longitude</label>
            <Input {...register("longitude")} type="number" step="any" placeholder="-0.1870" />
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-[var(--border)] bg-white p-4">
        <h3 className="text-sm font-semibold text-[var(--slate)] uppercase tracking-wide">Terms Mapping</h3>
        <p className="text-xs text-[var(--muted)]">Choose which agreement sections this facility requires at booking time.</p>
        <label className="flex items-center gap-2 text-sm text-[var(--navy)]">
          <input type="checkbox" {...register("requiresBookingTerms")} />
          Require Booking Terms and Conditions
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--navy)]">
          <input type="checkbox" {...register("requiresItemBookingTerms")} />
          Require Item Booking Terms
        </label>
      </div>

      {/* Access Code */}
      <div className="space-y-2 rounded-xl border border-[var(--border)] bg-white p-4">
        <h3 className="text-sm font-semibold text-[var(--slate)] uppercase tracking-wide">Access Code</h3>
        <p className="text-xs text-[var(--muted)]">If this facility requires an access code for entry, enable it here and provide the code.</p>
        <label className="flex items-center gap-2 text-sm text-[var(--navy)]">
          <input type="checkbox" {...register("hasAccessCode")} />
          This facility has an access code
        </label>
        {watch("hasAccessCode") && (
          <div className="mt-2">
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Access Code</label>
            <Input
              {...register("accessCode")}
              type="text"
              placeholder="Enter access code"
              autoComplete="off"
            />
          </div>
        )}
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

      {/* Category mappings */}
      <div className="space-y-3 pt-1">
        <h3 className="text-sm font-semibold text-[var(--slate)] uppercase tracking-wide">Category Pairing *</h3>
        <p className="text-xs text-[var(--muted)]">Enable one or more categories and set pricing for this facility.</p>
        <div className="space-y-2">
          {categoryMappings.map((mapping) => {
            const categoryName = categories.find((c) => c.slug === mapping.category)?.name ?? mapping.category;
            return (
              <div key={mapping.category} className="rounded-xl border border-[var(--border)] p-3 bg-white">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--navy)]">
                    <input
                      type="checkbox"
                      checked={mapping.enabled}
                      onChange={(e) => updateMapping(mapping.category, { enabled: e.target.checked })}
                    />
                    {categoryName}
                  </label>
                  <span className="text-xs text-[var(--muted)]">{mapping.category}</span>
                </div>
                {mapping.enabled && (
                  <div className="space-y-3 mt-3">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price (GH₵)"
                      value={mapping.price}
                      onChange={(e) => updateMapping(mapping.category, { price: e.target.value })}
                    />
                    <div>
                      <label className="block text-xs font-medium text-[var(--slate)] mb-2">Free Days of the Week</label>
                      <div className="flex gap-2 flex-wrap">
                        {DAYS.map(({ label, value }) => {
                          const freeDayNumbers = mapping.freeDays.split(",").map(d => Number(d.trim())).filter(d => Number.isInteger(d) && d >= 0 && d <= 6);
                          const isSelected = freeDayNumbers.includes(value);
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                let updated = freeDayNumbers.includes(value)
                                  ? freeDayNumbers.filter(d => d !== value)
                                  : [...freeDayNumbers, value].sort();
                                updateMapping(mapping.category, { freeDays: updated.join(",") });
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                isSelected
                                  ? "bg-[var(--navy)] text-white border-gold"
                                  : "bg-white text-[var(--slate)] border-gray-300 hover:bg-[var(--cream)]"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <Input
                      placeholder="Description (optional)"
                      value={mapping.description}
                      onChange={(e) => updateMapping(mapping.category, { description: e.target.value })}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? "Saving…" : isEdit ? "Update Facility" : "Create Facility"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
          Cancel
        </Button>
      </div>
    </Card></form>
  );
}
