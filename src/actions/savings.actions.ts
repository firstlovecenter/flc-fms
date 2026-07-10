"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { getAccountBalance } from "@/lib/finance";

const SavingsSchema = z.object({
  amount:    z.coerce.number().positive(),
  narration: z.string().min(5),
  accountId: z.string().min(1, "Select which account this transfer involves"),
});

// Shared with expense.actions.ts — serialises all financial writes
const FINANCE_ADVISORY_LOCK = 3141592653589793n;

/** Deposit: moves money OUT of `accountId` and into the savings pool. */
export async function depositToSavings(data: z.infer<typeof SavingsSchema>) {
  const session   = await requirePerm("finance:savings");
  const validated = SavingsSchema.parse(data);

  const account = await prisma.account.findFirst({ where: { id: validated.accountId, isActive: true } });
  if (!account) return { error: "Select a valid, active account to transfer from." };

  const txResult = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${FINANCE_ADVISORY_LOCK})`;

    // Re-verify the account is still active inside the lock, and compute its balance —
    // deposits can only draw down the specific account they're sourced from.
    const currentAccount = await tx.account.findFirst({ where: { id: validated.accountId, isActive: true } });
    if (!currentAccount) return { error: "The selected account is no longer active. Choose another account." };

    const accountBalance = await getAccountBalance(validated.accountId, tx);

    if (validated.amount > accountBalance) {
      return {
        error: `Insufficient balance in "${currentAccount.name}". Available: GH₵${accountBalance.toFixed(2)}, Requested: GH₵${validated.amount.toFixed(2)}`,
      };
    }

    const record = await tx.savingsTransaction.create({
      data: {
        type:        "DEPOSIT",
        amount:      validated.amount,
        narration:   validated.narration,
        createdById: session.sub,
        accountId:   validated.accountId,
      },
    });
    return { record };
  });

  if ("error" in txResult) return { error: txResult.error };

  auditLog({
    userId:   session.sub,
    action:   "SAVINGS_DEPOSIT",
    entity:   "SavingsTransaction",
    entityId: txResult.record.id,
    after:    { amount: validated.amount, narration: validated.narration, accountId: validated.accountId },
  });
  revalidatePath("/transactions");
  return { success: true, record: txResult.record };
}

/** Withdrawal: moves money OUT of the savings pool and into `accountId`. */
export async function withdrawFromSavings(data: z.infer<typeof SavingsSchema>) {
  const session   = await requirePerm("finance:savings");
  const validated = SavingsSchema.parse(data);

  const account = await prisma.account.findFirst({ where: { id: validated.accountId, isActive: true } });
  if (!account) return { error: "Select a valid, active account to transfer into." };

  const txResult = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${FINANCE_ADVISORY_LOCK})`;

    const currentAccount = await tx.account.findFirst({ where: { id: validated.accountId, isActive: true } });
    if (!currentAccount) return { error: "The selected account is no longer active. Choose another account." };

    // Compute current savings balance inside the lock — the pool itself is the constraint,
    // regardless of which account the money is being paid back into.
    const savingsAgg = await tx.savingsTransaction.groupBy({
      by: ["type"],
      _sum: { amount: true },
    });
    const savingsDeposits    = Number(savingsAgg.find((r) => r.type === "DEPOSIT")?._sum.amount    ?? 0);
    const savingsWithdrawals = Number(savingsAgg.find((r) => r.type === "WITHDRAWAL")?._sum.amount ?? 0);
    const currentSavings     = savingsDeposits - savingsWithdrawals;

    if (validated.amount > currentSavings) {
      return {
        error: `Insufficient savings balance. Current savings: GH₵${currentSavings.toFixed(2)}, Requested: GH₵${validated.amount.toFixed(2)}`,
      };
    }

    const record = await tx.savingsTransaction.create({
      data: {
        type:        "WITHDRAWAL",
        amount:      validated.amount,
        narration:   validated.narration,
        createdById: session.sub,
        accountId:   validated.accountId,
      },
    });
    return { record };
  });

  if ("error" in txResult) return { error: txResult.error };

  auditLog({
    userId:   session.sub,
    action:   "SAVINGS_WITHDRAWAL",
    entity:   "SavingsTransaction",
    entityId: txResult.record.id,
    after:    { amount: validated.amount, narration: validated.narration },
  });
  revalidatePath("/transactions");
  return { success: true, record: txResult.record };
}

export async function getSavingsTransactions() {
  await requirePerm("finance:savings");
  return prisma.savingsTransaction.findMany({
    include: {
      createdBy: { select: { name: true } },
      account:   { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
