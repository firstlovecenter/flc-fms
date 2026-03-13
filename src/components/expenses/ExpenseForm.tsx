"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { submitExpense } from "@/actions/expense.actions";

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

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError(null);
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

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto">
          {isSubmitting ? "Submitting…" : "Submit Request"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary w-full sm:w-auto">Cancel</button>
      </div>
    </form>
  );
}
