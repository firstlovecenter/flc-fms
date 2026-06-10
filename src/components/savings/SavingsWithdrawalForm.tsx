"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { withdrawFromSavings } from "@/actions/savings.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

interface Props {
  savingsBalance: number;
}

export default function SavingsWithdrawalForm({ savingsBalance }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const schema = z.object({
    amount:    z.coerce.number().positive("Amount must be positive")
      .max(savingsBalance, `Cannot exceed savings balance of GH₵${savingsBalance.toFixed(2)}`),
    narration: z.string().min(5, "Provide a brief narration (min 5 characters)"),
  });

  type FormData = z.infer<typeof schema>;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const result = await withdrawFromSavings(data);
    if ("error" in result && result.error) {
      setError(result.error as string);
    } else {
      router.push("/transactions?tab=savings");
      router.refresh();
    }
  }

  const isLocked = savingsBalance <= 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} ><Card className="p-6 space-y-5">
      {/* Balance info banner */}
      <div className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between border ${
        isLocked
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-blue-50 border-blue-200 text-blue-800"
      }`}>
        <span>Current savings balance</span>
        <span className="font-bold tabular-nums">GH₵{savingsBalance.toFixed(2)}</span>
      </div>

      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-sm">
          There are no funds in the savings account to transfer out.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
      )}

      <div>
        <Label htmlFor="savings-withdrawal-amount">Amount (GH₵) *</Label>
        <Input
          id="savings-withdrawal-amount"
          {...register("amount")}
          type="number"
          step="0.01"
          min="0.01"
          max={savingsBalance}
          placeholder="0.00"
          disabled={isLocked}
        />
        {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
      </div>

      <div>
        <Label htmlFor="savings-withdrawal-narration">Narration *</Label>
        <Textarea
          id="savings-withdrawal-narration"
          {...register("narration")}
          rows={3}
          placeholder="Reason for transferring to the operating account…"
          disabled={isLocked}
        />
        {errors.narration && <p className="text-red-500 text-xs mt-1">{errors.narration.message}</p>}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || isLocked} className="w-full sm:w-auto">
          {isSubmitting ? "Transferring…" : "Transfer to Operating"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
          Cancel
        </Button>
      </div>
    </Card></form>
  );
}
