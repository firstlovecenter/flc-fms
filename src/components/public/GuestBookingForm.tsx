"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createGuestBooking } from "@/actions/booking.actions";

const schema = z.object({
  facilityId: z.string().min(1, "Please select a facility"),
  guestName: z.string().min(2, "Name is required"),
  guestEmail: z.string().email("Enter a valid email"),
  guestPhone: z.string().min(9, "Phone number is required"),
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type Facility = {
  id: string;
  name: string;
  pricePerHour: unknown;
};

export default function GuestBookingForm({ facilities, defaultFacilityId }: { facilities: Facility[]; defaultFacilityId?: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { facilityId: defaultFacilityId ?? "" },
  });

  // Update form value when defaultFacilityId changes
  useEffect(() => {
    if (defaultFacilityId) {
      setValue("facilityId", defaultFacilityId);
    }
  }, [defaultFacilityId, setValue]);

  async function onSubmit(data: FormData) {
    setServerError(null);
    setSuccessMessage(null);

    const result = await createGuestBooking({
      facilityId: data.facilityId,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      title: data.title,
      description: data.description,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      notes: data.notes,
    });

    if ("error" in result && result.error) {
      setServerError(result.error);
      return;
    }

    setSuccessMessage("Booking request submitted. You can create a patron account to track status and payment.");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && <div className="alert alert-error">{serverError}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      <div className="card-inset p-4 md:p-5">
        <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>Guest Information</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Full Name</label>
            <input {...register("guestName")} className="input" />
            {errors.guestName && <p className="text-xs text-red-600 mt-1">{errors.guestName.message}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input {...register("guestEmail")} type="email" className="input" />
            {errors.guestEmail && <p className="text-xs text-red-600 mt-1">{errors.guestEmail.message}</p>}
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Phone</label>
          <input {...register("guestPhone")} className="input" />
          {errors.guestPhone && <p className="text-xs text-red-600 mt-1">{errors.guestPhone.message}</p>}
        </div>
      </div>

      <div className="card-inset p-4 md:p-5">
        <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>Booking Details</p>
        <div>
          <label className="label">Facility</label>
          <select {...register("facilityId")} className="input">
            <option value="">Select a facility</option>
            {facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>{facility.name} ({Number(facility.pricePerHour).toFixed(2)}/hr)</option>
            ))}
          </select>
          {errors.facilityId && <p className="text-xs text-red-600 mt-1">{errors.facilityId.message}</p>}
        </div>

        <div className="mt-4">
          <label className="label">Booking Title</label>
          <input {...register("title")} className="input" placeholder="Wedding reception, conference, rehearsal" />
          {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
        </div>

        <div className="mt-4">
          <label className="label">Description (optional)</label>
          <textarea {...register("description")} className="input" rows={3} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="label">Start</label>
            <input {...register("startTime")} type="datetime-local" className="input" />
            {errors.startTime && <p className="text-xs text-red-600 mt-1">{errors.startTime.message}</p>}
          </div>
          <div>
            <label className="label">End</label>
            <input {...register("endTime")} type="datetime-local" className="input" />
            {errors.endTime && <p className="text-xs text-red-600 mt-1">{errors.endTime.message}</p>}
          </div>
        </div>
      </div>

      <div className="card-inset p-4 md:p-5">
        <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>Additional Notes</p>
        <label className="label">Additional Notes (optional)</label>
        <textarea {...register("notes")} className="input" rows={3} />
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-gold w-full" style={{ paddingBlock: 12 }}>
        {isSubmitting ? "Submitting..." : "Submit Guest Booking"}
      </button>
    </form>
  );
}
