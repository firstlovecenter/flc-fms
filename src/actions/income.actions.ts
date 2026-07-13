"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { isTransactionLocked, transactionLockMessage } from "@/lib/transaction-lock";
import { getAccountLedgerEvents, findNegativeBalancePoint, toPesewas } from "@/lib/finance";

// Shared with expense/savings actions — serialises all money-moving writes
const FINANCE_ADVISORY_LOCK = 3141592653589793n;

// Backdated income is allowed; future-dated income is not. A day of slack keeps "today"
// picked in any timezone from tripping the check.
const notInFuture = (d: Date) => d.getTime() <= Date.now() + 24 * 60 * 60 * 1000;

const IncomeSchema = z.object({
  title:      z.string().min(2),
  narration:  z.string().min(10),
  amount:     z.coerce.number().positive(),
  category:   z.string().min(2),
  source:     z.string().optional(),
  bookingId:  z.string().optional(),
  accountId:  z.string().min(1, "Select which account this income is recorded against"),
  receivedAt: z.coerce.date().refine(notInFuture, "Date received cannot be in the future")});

const UpdateIncomeSchema = z.object({
  title:      z.string().min(2),
  narration:  z.string().min(10),
  amount:     z.coerce.number().positive(),
  category:   z.string().min(2),
  source:     z.string().optional(),
  accountId:  z.string().min(1, "Select which account this income is recorded against"),
  receivedAt: z.coerce.date().refine(notInFuture, "Date received cannot be in the future"),
});

export async function recordIncome(data: z.infer<typeof IncomeSchema>) {
  const session  = await requirePerm("finance:record_income");
  const validated = IncomeSchema.parse(data);

  const account = await prisma.account.findFirst({ where: { id: validated.accountId, isActive: true } });
  if (!account) return { error: "Select a valid, active account to record this income against." };

  if (validated.bookingId) {
    const existingLinked = await prisma.income.findUnique({ where: { bookingId: validated.bookingId } });
    if (existingLinked && !existingLinked.deletedAt) {
      return { error: "An income record is already linked to this booking." };
    }
    if (existingLinked?.deletedAt) {
      const restored = await prisma.income.update({
        where: { id: existingLinked.id },
        data: {
          recordedById: session.sub,
          title: validated.title,
          narration: validated.narration,
          amount: validated.amount,
          category: validated.category,
          source: validated.source,
          accountId: validated.accountId,
          receivedAt: validated.receivedAt,
          deletedAt: null,
        },
      });

      auditLog({ userId: session.sub, action: "RESTORE_INCOME", entity: "Income", entityId: restored.id });
      revalidatePath("/transactions");
      revalidatePath("/bookings");
      return { success: true, income: restored };
    }
  }

  const income = await prisma.income.create({
    data: { recordedById: session.sub, ...validated }});

  auditLog({ userId: session.sub, action: "RECORD_INCOME", entity: "Income", entityId: income.id });
  revalidatePath("/transactions");
  revalidatePath("/bookings");
  return { success: true, income };
}

export async function getBookingsForIncomeLink() {
  await requirePerm("finance:record_income");
  // Return bookings that don't already have a linked income record
  const bookings = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      income: null,
      status: { in: ["APPROVED", "COMPLETED"] },
    },
    select: { id: true, title: true, totalAmount: true, startTime: true, facility: { select: { name: true } } },
    orderBy: { startTime: "desc" },
    take: 50,
  });
  return bookings;
}

export async function getIncomeSummary() {
  await requirePerm("finance:record_income");  const [records, monthly] = await Promise.all([
    prisma.income.findMany({
      where: { deletedAt: null },
      include: { recordedBy: { select: { name: true } } },
      orderBy: { receivedAt: "desc" },
      take: 50}),
    prisma.income.groupBy({
      by: ["category"],
      where: { deletedAt: null },
      _sum: { amount: true },
      _count: true}),
  ]);

  return { records, monthly };
}

export async function updateIncome(incomeId: string, data: z.infer<typeof UpdateIncomeSchema>) {
  const session = await requirePerm("finance:record_income");
  const validated = UpdateIncomeSchema.parse(data);

  const existing = await prisma.income.findFirst({
    where: { id: incomeId, deletedAt: null },
    select: { createdAt: true, accountId: true, amount: true },
  });

  if (!existing) return { error: "Income record not found." };
  if (isTransactionLocked(existing.createdAt)) {
    return { error: transactionLockMessage() };
  }

  const account = await prisma.account.findFirst({ where: { id: validated.accountId, isActive: true } });
  if (!account) return { error: "Select a valid, active account to record this income against." };

  // Changing the amount, date, or account of this income shifts money on the ORIGINAL
  // account's timeline. Replay that timeline with the edit applied and reject the change
  // if the account would dip below zero at ANY point in time — today's balance alone
  // isn't enough once entries can be backdated. Runs under the shared advisory lock so
  // it can't race concurrent approvals/transfers.
  const txResult = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${FINANCE_ADVISORY_LOCK})`;

    if (existing.accountId) {
      const events = await getAccountLedgerEvents(existing.accountId, tx, { incomeId });
      if (existing.accountId === validated.accountId) {
        events.push({ at: validated.receivedAt, deltaPesewas: toPesewas(validated.amount) });
      }
      // Moving the income to a DIFFERENT account only adds money there — no check needed
      // on the destination, but the source must survive losing this income entirely.
      const negative = findNegativeBalancePoint(events);
      if (negative) {
        return {
          error: existing.accountId === validated.accountId
            ? `This change would take the account to GH₵${negative.balance.toFixed(2)} on ${negative.at.toISOString().split("T")[0]}. Accounts can never go negative at any point in time.`
            : `Moving this income off its current account would take that account to GH₵${negative.balance.toFixed(2)} on ${negative.at.toISOString().split("T")[0]}. Resolve that first.`,
        };
      }
    }

    const updated = await tx.income.update({
      where: { id: incomeId },
      data: {
        ...validated,
        recordedById: session.sub,
      },
    });
    return { updated };
  });

  if ("error" in txResult) return { error: txResult.error };

  auditLog({ userId: session.sub, action: "UPDATE_INCOME", entity: "Income", entityId: incomeId });
  revalidatePath("/transactions");
  return { success: true, income: txResult.updated };
}

export async function deleteIncome(incomeId: string) {
  const session = await requirePerm("finance:record_income");

  const existing = await prisma.income.findFirst({
    where: { id: incomeId, deletedAt: null },
    select: { createdAt: true, accountId: true, amount: true },
  });

  if (!existing) return { error: "Income record not found." };
  if (isTransactionLocked(existing.createdAt)) {
    return { error: transactionLockMessage() };
  }

  // The account must stay non-negative at every point on its timeline even after this
  // income is removed — not just at today's balance. Serialised via the advisory lock.
  const txResult = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${FINANCE_ADVISORY_LOCK})`;

    if (existing.accountId) {
      const events = await getAccountLedgerEvents(existing.accountId, tx, { incomeId });
      const negative = findNegativeBalancePoint(events);
      if (negative) {
        return {
          error: `Deleting this income would take its account to GH₵${negative.balance.toFixed(2)} on ${negative.at.toISOString().split("T")[0]}. Resolve that first.`,
        };
      }
    }

    await tx.income.update({
      where: { id: incomeId },
      data: { deletedAt: new Date() },
    });
    return { ok: true };
  });

  if ("error" in txResult) return { error: txResult.error };

  auditLog({ userId: session.sub, action: "DELETE_INCOME", entity: "Income", entityId: incomeId });
  revalidatePath("/transactions");
  return { success: true };
}
