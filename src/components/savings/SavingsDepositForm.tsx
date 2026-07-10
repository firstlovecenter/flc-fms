"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { depositToSavings } from "@/actions/savings.actions";
import { Button } from "@/components/ui/button";
import { Input, inputStyles } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AccountOption {
  id: string;
  name: string;
  balance: number;
}

interface Props {
  accounts: AccountOption[];
}

const schema = z.object({
  amount:    z.coerce.number().positive("Amount must be positive"),
  narration: z.string().min(5, "Provide a brief narration (min 5 characters)"),
  accountId: z.string().min(1, "Select which account to transfer from"),
});

type FormData = z.infer<typeof schema>;

export default function SavingsDepositForm({ accounts }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const selectedAccount = accounts.find((a) => a.id === watch("accountId"));
  const isLocked = accounts.length === 0;

  async function onSubmit(data: FormData) {
    setError(null);
    const account = accounts.find((a) => a.id === data.accountId);
    if (account && data.amount > account.balance) {
      setError(`Cannot exceed "${account.name}"'s balance of GH₵${account.balance.toFixed(2)}`);
      return;
    }
    const result = await depositToSavings(data);
    if ("error" in result && result.error) {
      setError(result.error as string);
    } else {
      router.push("/transactions?tab=savings");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} ><Card className="p-6 space-y-5">
      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-sm">
          There are no active accounts to transfer from. Create one under Transactions ▸ Accounts.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
      )}

      <div>
        <Label htmlFor="savings-deposit-account">From Account *</Label>
        <select id="savings-deposit-account" {...register("accountId")} className={cn(inputStyles)} disabled={isLocked}>
          <option value="" disabled>Select an account…</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} — GH₵{a.balance.toFixed(2)}</option>)}
        </select>
        {errors.accountId && <p className="text-red-500 text-xs mt-1">{errors.accountId.message}</p>}
      </div>

      {selectedAccount && (
        <div className="rounded-lg px-4 py-3 text-sm flex items-center justify-between border bg-emerald-50 border-emerald-200 text-emerald-800">
          <span>Available balance in &ldquo;{selectedAccount.name}&rdquo;</span>
          <span className="font-bold tabular-nums">GH₵{selectedAccount.balance.toFixed(2)}</span>
        </div>
      )}

      <div>
        <Label htmlFor="savings-deposit-amount">Amount (GH₵) *</Label>
        <Input
          id="savings-deposit-amount"
          {...register("amount")}
          type="text"
          inputMode="decimal"
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
