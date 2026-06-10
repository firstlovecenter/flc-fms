"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { depositToSavings } from "@/actions/savings.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

interface Props {
  availableBalance: number;
}

export default function SavingsDepositForm({ availableBalance }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const schema = z.object({
    amount:    z.coerce.number().positive("Amount must be positive")
      .max(availableBalance, `Cannot exceed available balance of GH₵${availableBalance.toFixed(2)}`),
    narration: z.string().min(5, "Provide a brief narration (min 5 characters)"),
  });

  type FormData = z.infer<typeof schema>;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const result = await depositToSavings(data);
    if ("error" in result && result.error) {
      setError(result.error as string);
    } else {
      router.push("/transactions?tab=savings");
      router.refresh();
    }
  }

  const isLocked = availableBalance <= 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} ><Card className="p-6 space-y-5">
      {/* Balance info banner */}
      <div className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between border ${
        isLocked
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-emerald-50 border-emerald-200 text-emerald-800"
      }`}>
        <span>Available operating balance</span>
        <span className="font-bold tabular-nums">GH₵{availableBalance.toFixed(2)}</span>
      </div>

      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-sm">
          There are no funds in the operating account to transfer into savings right now.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
      )}

      <div>
        <Label htmlFor="savings-deposit-amount">Amount (GH₵) *</Label>
        <Input
          id="savings-deposit-amount"
          {...register("amount")}
          type="text"
          inputMode="decimal"
          max={availableBalance}
          placeholder="0.00"
          disabled={isLocked}
        />
        {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
      </div>

      <div>
        <Label htmlFor="savings-deposit-narration">Narration *</Label>
        <Textarea
          id="savings-deposit-narration"
          {...register("narration")}
          rows={3}
          placeholder="Reason for transferring to savings…"
          disabled={isLocked}
        />
        {errors.narration && <p className="text-red-500 text-xs mt-1">{errors.narration.message}</p>}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || isLocked} className="w-full sm:w-auto">
          {isSubmitting ? "Transferring…" : "Transfer to Savings"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
          Cancel
        </Button>
      </div>
    </Card></form>
  );
}
