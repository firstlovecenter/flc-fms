"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { withdrawFromSavings } from "@/actions/savings.actions";
import { Button } from "@/components/ui/button";
import { Input, inputStyles } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  savingsBalance: number;
  accounts: { id: string; name: string }[];
}

const schema = z.object({
  amount:    z.coerce.number().positive("Amount must be positive"),
  narration: z.string().min(5, "Provide a brief narration (min 5 characters)"),
  accountId: z.string().min(1, "Select which account to transfer into"),
});

type FormData = z.infer<typeof schema>;

export default function SavingsWithdrawalForm({ savingsBalance, accounts }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const isLocked = savingsBalance <= 0 || accounts.length === 0;

  async function onSubmit(data: FormData) {
    setError(null);
    if (data.amount > savingsBalance) {
      setError(`Cannot exceed savings balance of GH₵${savingsBalance.toFixed(2)}`);
      return;
    }
    const result = await withdrawFromSavings(data);
    if ("error" in result && result.error) {
      setError(result.error as string);
    } else {
      router.push("/transactions?tab=savings");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} ><Card className="p-6 space-y-5">
      {/* Balance info banner */}
      <div className={`rounded-lg px-4 py-3 text-sm flex items-center justify-between border ${
        savingsBalance <= 0
          ? "bg-danger/10 border-danger/30 text-danger"
          : "bg-info/10 border-info/30 text-info"
      }`}>
        <span>Current savings balance</span>
        <span className="font-bold tabular-nums">GH₵{savingsBalance.toFixed(2)}</span>
      </div>

      {savingsBalance <= 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-warning text-sm">
          There are no funds in savings to transfer out.
        </div>
      )}

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-danger text-sm">{error}</div>
      )}

      <div>
        <Label htmlFor="savings-withdrawal-account">Into Account *</Label>
        <select id="savings-withdrawal-account" {...register("accountId")} className={cn(inputStyles)} disabled={isLocked}>
          <option value="" disabled>Select an account…</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {errors.accountId && <p className="text-danger text-xs mt-1">{errors.accountId.message}</p>}
      </div>

      <div>
        <Label htmlFor="savings-withdrawal-amount">Amount (GH₵) *</Label>
        <Input
          id="savings-withdrawal-amount"
          {...register("amount")}
          type="text"
          inputMode="decimal"
          max={savingsBalance}
          placeholder="0.00"
          disabled={isLocked}
        />
        {errors.amount && <p className="text-danger text-xs mt-1">{errors.amount.message}</p>}
      </div>

      <div>
        <Label htmlFor="savings-withdrawal-narration">Narration *</Label>
        <Textarea
          id="savings-withdrawal-narration"
          {...register("narration")}
          rows={3}
          placeholder="Reason for transferring out of savings…"
          disabled={isLocked}
        />
        {errors.narration && <p className="text-danger text-xs mt-1">{errors.narration.message}</p>}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || isLocked} className="w-full sm:w-auto">
          {isSubmitting ? "Transferring…" : "Transfer from Savings"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
          Cancel
        </Button>
      </div>
    </Card></form>
  );
}
