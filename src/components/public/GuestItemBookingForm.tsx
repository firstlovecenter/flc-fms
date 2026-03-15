"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createGuestItemBooking } from "@/actions/bookable-items.actions";
import { Package, Layers, Minus, Plus, CheckCircle2 } from "lucide-react";

const schema = z.object({
  guestName:   z.string().min(2, "Name is required"),
  guestEmail:  z.string().email("Enter a valid email"),
  guestPhone:  z.string().min(9, "Phone number is required"),
  title:       z.string().min(2, "Booking title is required"),
  description: z.string().optional(),
  startTime:   z.string().min(1, "Start time is required"),
  endTime:     z.string().min(1, "End time is required"),
  notes:       z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type Line = {
  type: "item" | "bundle";
  id: string;
  name: string;
  unitPrice: number;
  unit: string;
  qty: number;
};

export default function GuestItemBookingForm({
  initialLines,
}: {
  initialLines: Line[];
}) {
  const [lines, setLines] = useState<Line[]>(initialLines);
  const [serverError, setServerError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function updateQty(id: string, delta: number) {
    setLines(prev =>
      prev
        .map(l => l.id === id ? { ...l, qty: l.qty + delta } : l)
        .filter(l => l.qty > 0)
    );
  }

  const total = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);

  async function onSubmit(data: FormData) {
    setServerError(null);
    if (lines.length === 0) {
      setServerError("You have no items in your selection.");
      return;
    }
    const result = await createGuestItemBooking({
      guestName:   data.guestName,
      guestEmail:  data.guestEmail,
      guestPhone:  data.guestPhone,
      title:       data.title,
      description: data.description,
      startTime:   new Date(data.startTime),
      endTime:     new Date(data.endTime),
      notes:       data.notes,
      lines: lines.map(l => ({
        itemId:   l.type === "item"   ? l.id : undefined,
        bundleId: l.type === "bundle" ? l.id : undefined,
        quantity: l.qty,
      })),
    });

    if ("error" in result && result.error) {
      setServerError(result.error as string);
      return;
    }
    if ("bookingId" in result) {
      setBookingId(result.bookingId as string);
    }
  }

  if (bookingId) {
    return (
      <div className="py-10 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-emerald-500" />
        </div>
        <h3 className="font-display text-2xl font-bold text-[var(--navy)] dark:text-gray-100">Booking Request Submitted!</h3>
        <p className="text-[var(--slate)] dark:text-gray-300 max-w-sm mx-auto">
          Our team will review your request and get back to you via email. Reference: <strong>{bookingId.slice(0, 8).toUpperCase()}</strong>
        </p>
        <a href="/catalog?tab=items" className="inline-flex items-center gap-2 text-sm font-semibold mt-2 text-[var(--navy)] dark:text-[var(--gold)]">
          ← Back to catalog
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && <div className="alert alert-error">{serverError}</div>}

      {/* SELECTED ITEMS SUMMARY */}
      <div className="card-inset p-4 md:p-5">
        <p className="text-xs uppercase tracking-wider mb-3 font-bold text-[var(--muted)] dark:text-gray-400">
          Your Selection
        </p>
        {lines.length === 0 ? (
          <p className="text-sm text-[var(--muted)] dark:text-gray-400">No items selected. <a href="/catalog?tab=items" className="text-[var(--navy)] dark:text-gray-200">Browse items</a></p>
        ) : (
          <div className="space-y-2">
            {lines.map(line => (
              <div key={line.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 text-sm">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--cream)] dark:bg-[rgba(15,26,43,0.4)]"
                >
                  {line.type === "bundle" ? <Layers size={14} className="text-[var(--gold)]" /> : <Package size={14} className="text-[var(--navy)] dark:text-gray-200" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--navy)] dark:text-gray-100 truncate">{line.name}</p>
                  <p className="text-xs text-[var(--muted)] dark:text-gray-400">
                    GH₵{line.unitPrice.toFixed(2)} / {line.unit}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => updateQty(line.id, -1)}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                    <Minus size={11} />
                  </button>
                  <span className="w-6 text-center font-bold text-sm">{line.qty}</span>
                  <button type="button" onClick={() => updateQty(line.id, 1)}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                    <Plus size={11} />
                  </button>
                </div>
                <span className="text-sm font-semibold text-[var(--navy)] dark:text-gray-100 w-20 text-right">
                  GH₵{(line.unitPrice * line.qty).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="flex justify-between pt-3 border-t border-[var(--border)] dark:border-[rgba(255,255,255,0.1)] font-bold text-[var(--navy)] dark:text-gray-100">
              <span>Estimated Total</span>
              <span>GH₵{total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-[var(--muted)] dark:text-gray-400">
              * Final price confirmed by staff after review
            </p>
          </div>
        )}
      </div>

      {/* GUEST INFO */}
      <div className="card-inset p-4 md:p-5">
        <p className="text-xs uppercase tracking-wider mb-3 font-bold text-[var(--muted)] dark:text-gray-400">
          Your Information
        </p>
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

      {/* BOOKING DETAILS */}
      <div className="card-inset p-4 md:p-5">
        <p className="text-xs uppercase tracking-wider mb-3 font-bold text-[var(--muted)] dark:text-gray-400">
          Event Details
        </p>
        <div>
          <label className="label">Booking Title</label>
          <input {...register("title")} className="input" placeholder="e.g. Wedding reception, fundraiser gala" />
          {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
        </div>
        <div className="mt-4">
          <label className="label">Description (optional)</label>
          <textarea {...register("description")} className="input" rows={2} placeholder="Briefly describe your event" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="label">Event Start</label>
            <input {...register("startTime")} type="datetime-local" className="input" />
            {errors.startTime && <p className="text-xs text-red-600 mt-1">{errors.startTime.message}</p>}
          </div>
          <div>
            <label className="label">Event End</label>
            <input {...register("endTime")} type="datetime-local" className="input" />
            {errors.endTime && <p className="text-xs text-red-600 mt-1">{errors.endTime.message}</p>}
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Additional Notes (optional)</label>
          <textarea {...register("notes")} className="input" rows={2} placeholder="Delivery location, special requirements..." />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || lines.length === 0}
        className="btn-gold w-full"
        style={{ paddingBlock: 12 }}
      >
        {isSubmitting ? "Submitting..." : "Submit Item Booking Request"}
      </button>
    </form>
  );
}
