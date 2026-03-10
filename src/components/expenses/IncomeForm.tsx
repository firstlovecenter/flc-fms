"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { recordIncome, getBookingsForIncomeLink } from "@/actions/income.actions";

const schema = z.object({
  title:      z.string().min(2, "Title is required"),
  narration:  z.string().min(10, "Provide a detailed narration"),
  amount:     z.coerce.number().positive("Amount must be positive"),
  category:   z.string().min(2, "Category is required"),
  source:     z.string().optional(),
  bookingId:  z.string().optional(),
  receivedAt: z.string().min(1, "Date is required"),
});

type FormData = z.infer<typeof schema>;

type BookingOption = {
  id: string;
  title: string;
  totalAmount: { toString(): string };
  startTime: Date;
  facility: { name: string } | null;
};

const CATEGORIES = [
  "Tithes & Offerings", "Facility Hire", "Donations", "Grants",
  "Fundraising", "Membership Dues", "Programme Fees", "Other",
];

export default function IncomeForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingOption[]>([]);

  useEffect(() => {
    getBookingsForIncomeLink().then(setBookings).catch(() => {});
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { receivedAt: new Date().toISOString().split("T")[0] },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const result = await recordIncome({
      title:      data.title,
      narration:  data.narration,
      amount:     data.amount,
      category:   data.category,
      source:     data.source || undefined,
      bookingId:  data.bookingId || undefined,
      receivedAt: new Date(data.receivedAt),
    });

    if ("error" in result && result.error) {
      setError(result.error as string);
    } else {
      router.push("/transactions?tab=income");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Title *</label>
        <input {...register("title")} className="input" placeholder="e.g. Sunday Offering — 5 Jan 2025" />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Narration *</label>
        <textarea {...register("narration")} className="input" rows={3}
          placeholder="Detailed description of the income source, how it was collected, etc." />
        {errors.narration && <p className="text-red-500 text-xs mt-1">{errors.narration.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Amount (GHS) *</label>
          <input {...register("amount")} type="number" step="0.01" className="input" placeholder="0.00" />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Category *</label>
          <select {...register("category")} className="input">
            <option value="">Select…</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Source</label>
          <input {...register("source")} className="input" placeholder="e.g. Church Service, Wire Transfer" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Date Received *</label>
          <input {...register("receivedAt")} type="date" className="input" />
          {errors.receivedAt && <p className="text-red-500 text-xs mt-1">{errors.receivedAt.message}</p>}
        </div>
      </div>

      {bookings.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Link to Booking (optional)</label>
          <select {...register("bookingId")} className="input">
            <option value="">— No booking linked —</option>
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} {b.facility ? `(${b.facility.name})` : ""} — GHS {Number(b.totalAmount).toFixed(2)}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--muted)] mt-1">Link this income to an existing approved booking</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? "Saving…" : "Record Income"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
