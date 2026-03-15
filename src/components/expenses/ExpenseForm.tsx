"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { submitExpense } from "@/actions/expense.actions";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { WifiOff } from "lucide-react";

const schema = z.object({
  title:      z.string().min(2, "Title is required"),
  narration:  z.string().min(10, "Please provide a detailed narration (min 10 chars)"),
  amount:     z.coerce.number().positive("Amount must be positive"),
  category:   z.string().min(2, "Category is required"),
});

type FormData = z.infer<typeof schema>;

const CATEGORIES = [
  "Utilities",
  "ECG",
  "Sewage",
  "Rubbish",
  "Welding",
  "Painting",
  "Purchases",
  "Fuel",
  "Transport",
  "CAPENTRY",
  "Electricals",
  "Plumbing",
  "Constructions",
  "Other",
];

export default function ExpenseForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [savedOffline, setSavedOffline] = useState(false);
  const { isOnline, enqueue } = useOfflineQueue();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError(null);
    setSavedOffline(false);

    // If offline, save to IndexedDB queue and show confirmation
    if (!isOnline) {
      await enqueue({
        type: "expense",
        label: `${data.category} — ${data.title}`,
        data: {
          title:     data.title,
          narration: data.narration,
          amount:    data.amount,
          category:  data.category,
        },
      });
      setSavedOffline(true);
      reset();
      return;
    }

    const result = await submitExpense({
      title:      data.title,
      narration:  data.narration,
      amount:     data.amount,
      category:   data.category,
    });

    if ("error" in result && result.error) {
      setError(result.error as string);
    } else {
      router.push("/transactions?tab=expenses");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
      {!isOnline && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <WifiOff size={15} />
          <span>You&apos;re offline. Your request will be saved locally and submitted when you reconnect.</span>
        </div>
      )}

      {savedOffline && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 text-sm">
          Request saved offline. It will be submitted automatically when your connection is restored. You can also submit it from the banner at the top of the page.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Title *</label>
        <input {...register("title")} className="input" placeholder="e.g. Generator Fuel — October" />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">
          Narration * <span className="font-normal text-[var(--muted)]">(comprehensive description)</span>
        </label>
        <textarea
          {...register("narration")}
          className="input"
          rows={4}
          placeholder="Describe the expense in detail: what it's for, why it's needed, vendor name, date of purchase, etc."
        />
        {errors.narration && <p className="text-red-500 text-xs mt-1">{errors.narration.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Amount (GH₵) *</label>
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

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto">
          {isSubmitting
            ? isOnline ? "Submitting…" : "Saving offline…"
            : isOnline ? "Submit Request" : "Save Offline"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary w-full sm:w-auto">Cancel</button>
      </div>
    </form>
  );
}
