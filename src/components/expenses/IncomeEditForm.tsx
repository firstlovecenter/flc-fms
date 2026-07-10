"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { updateIncome } from "@/actions/income.actions";
import { Button } from "@/components/ui/button";
import { Input, inputStyles } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  narration: z.string().min(10, "Provide a detailed narration"),
  amount: z.coerce.number().positive("Amount must be positive"),
  category: z.string().min(2, "Category is required"),
  source: z.string().optional(),
  accountId: z.string().min(1, "Select which account this income is recorded against"),
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
    accountId: string | null;
    receivedAt: Date;
  };
  accounts: { id: string; name: string }[];
};

const CATEGORIES = [
  "Federal", "Events", "Weddings", "Namings",
  "ECG", "Fuel", "Donations", "Other",
];

export default function IncomeEditForm({ income, accounts }: IncomeEditFormProps) {
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
      accountId: income.accountId ?? "",
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
      accountId: data.accountId,
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
    <form onSubmit={handleSubmit(onSubmit)} ><Card className="p-6 space-y-5">
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

      <div>
        <Label htmlFor="income-edit-title">Title *</Label>
        <Input id="income-edit-title" {...register("title")} />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="income-edit-narration">Narration *</Label>
        <Textarea id="income-edit-narration" {...register("narration")} rows={3} />
        {errors.narration && <p className="text-red-500 text-xs mt-1">{errors.narration.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="income-edit-amount">Amount (GH₵) *</Label>
          <Input id="income-edit-amount" {...register("amount")} type="text" inputMode="decimal" />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
        </div>
        <div>
          <Label htmlFor="income-edit-category">Category *</Label>
          <select id="income-edit-category" {...register("category")} className={cn(inputStyles)}>
            <option value="">Select…</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="income-edit-source">Source</Label>
          <Input id="income-edit-source" {...register("source")} />
        </div>
        <div>
          <Label htmlFor="income-edit-received-at">Date Received *</Label>
          <Input id="income-edit-received-at" {...register("receivedAt")} type="date" />
          {errors.receivedAt && <p className="text-red-500 text-xs mt-1">{errors.receivedAt.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="income-edit-account">Account *</Label>
        <select id="income-edit-account" {...register("accountId")} className={cn(inputStyles)}>
          <option value="" disabled>Select which account this income goes into…</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {errors.accountId && <p className="text-red-500 text-xs mt-1">{errors.accountId.message}</p>}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? "Saving…" : "Update Income"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">Cancel</Button>
      </div>
    </Card></form>
  );
}
