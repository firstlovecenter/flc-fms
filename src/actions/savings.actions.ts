"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { getTotalIncomeIncludingBookingRevenue } from "@/lib/finance";

const SavingsSchema = z.object({
  amount:    z.coerce.number().positive(),
  narration: z.string().min(5),
});

// Shared with expense.actions.ts — serialises all financial writes
const FINANCE_ADVISORY_LOCK = 3141592653589793n;

export async function depositToSavings(data: z.infer<typeof SavingsSchema>) {
  const session   = await requireStaff("FACILITY_MANAGER");
  const validated = SavingsSchema.parse(data);

  const txResult = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${FINANCE_ADVISORY_LOCK})`;

    // Compute available balance inside the lock
    const [incomeTotals, approvedExpAgg, savingsAgg] = await Promise.all([
      getTotalIncomeIncludingBookingRevenue(),
      tx.expense.aggregate({
        where: { status: "APPROVED", deletedAt: null },
        _sum: { amount: true },
      }),
      tx.savingsTransaction.groupBy({ by: ["type"], _sum: { amount: true } }),
    ]);

    const totalApprovedExpenses = Number(approvedExpAgg._sum.amount ?? 0);
    const savingsDeposits       = Number(savingsAgg.find((r) => r.type === "DEPOSIT")?._sum.amount    ?? 0);
    const savingsWithdrawals    = Number(savingsAgg.find((r) => r.type === "WITHDRAWAL")?._sum.amount ?? 0);
    const netSavings            = savingsDeposits - savingsWithdrawals;
    const availableBalance      = incomeTotals.totalIncome - totalApprovedExpenses - netSavings;

    if (validated.amount > availableBalance) {
      return {
        error: `Insufficient available balance. Available: GH₵${availableBalance.toFixed(2)}, Requested: GH₵${validated.amount.toFixed(2)}`,
      };
    }

    const record = await tx.savingsTransaction.create({
      data: {
        type:        "DEPOSIT",
        amount:      validated.amount,
        narration:   validated.narration,
        createdById: session.sub,
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
    after:    { amount: validated.amount, narration: validated.narration },
  });
  revalidatePath("/transactions");
  return { success: true, record: txResult.record };
}

export async function withdrawFromSavings(data: z.infer<typeof SavingsSchema>) {
  const session   = await requireStaff("FACILITY_MANAGER");
  const validated = SavingsSchema.parse(data);

  const txResult = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${FINANCE_ADVISORY_LOCK})`;

    // Compute current savings balance inside the lock
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
  await requireStaff("FACILITY_MANAGER");
  return prisma.savingsTransaction.findMany({
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
