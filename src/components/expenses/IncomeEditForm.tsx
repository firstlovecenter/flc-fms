"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { updateIncome } from "@/actions/income.actions";

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  narration: z.string().min(10, "Provide a detailed narration"),
  amount: z.coerce.number().positive("Amount must be positive"),
  category: z.string().min(2, "Category is required"),
  source: z.string().optional(),
  receivedAt: z.string().min(1, "Date is required"),
});

type FormData = z.infer<typeof schema>;

type IncomeEditFormProps = {
  income: {
    id: string;
    title: string;
    narration: string;
    amount: number;
    category: string;
    source: string | null;
    receivedAt: Date;
  };
};

const CATEGORIES = [
  "Federal", "Events", "Weddings", "Namings",
  "ECG", "Fuel", "Donations", "Other",
];

export default function IncomeEditForm({ income }: IncomeEditFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: income.title,
      narration: income.narration,
      amount: income.amount,
      category: income.category,
      source: income.source ?? "",
      receivedAt: new Date(income.receivedAt).toISOString().split("T")[0],
    },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const result = await updateIncome(income.id, {
      title: data.title,
      narration: data.narration,
      amount: data.amount,
      category: data.category,
      source: data.source || undefined,
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
        <input {...register("title")} className="input" />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Narration *</label>
        <textarea {...register("narration")} className="input" rows={3} />
        {errors.narration && <p className="text-red-500 text-xs mt-1">{errors.narration.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Amount (GH₵) *</label>
          <input {...register("amount")} type="number" step="0.01" className="input" />
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Source</label>
          <input {...register("source")} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Date Received *</label>
          <input {...register("receivedAt")} type="date" className="input" />
          {errors.receivedAt && <p className="text-red-500 text-xs mt-1">{errors.receivedAt.message}</p>}
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto">
          {isSubmitting ? "Saving…" : "Update Income"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary w-full sm:w-auto">Cancel</button>
      </div>
    </form>
  );
}
