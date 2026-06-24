"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { isTransactionLocked, transactionLockMessage } from "@/lib/transaction-lock";

const IncomeSchema = z.object({
  title:      z.string().min(2),
  narration:  z.string().min(10),
  amount:     z.coerce.number().positive(),
  category:   z.string().min(2),
  source:     z.string().optional(),
  bookingId:  z.string().optional(),
  receivedAt: z.coerce.date()});

const UpdateIncomeSchema = z.object({
  title:      z.string().min(2),
  narration:  z.string().min(10),
  amount:     z.coerce.number().positive(),
  category:   z.string().min(2),
  source:     z.string().optional(),
  receivedAt: z.coerce.date(),
});

export async function recordIncome(data: z.infer<typeof IncomeSchema>) {
  const session  = await requirePerm("finance:record_income");  const validated = IncomeSchema.parse(data);

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
    select: { createdAt: true },
  });

  if (!existing) return { error: "Income record not found." };
  if (isTransactionLocked(existing.createdAt)) {
    return { error: transactionLockMessage() };
  }

  const updated = await prisma.income.update({
    where: { id: incomeId },
    data: {
      ...validated,
      recordedById: session.sub,
    },
  });

  auditLog({ userId: session.sub, action: "UPDATE_INCOME", entity: "Income", entityId: incomeId });
  revalidatePath("/transactions");
  return { success: true, income: updated };
}

export async function deleteIncome(incomeId: string) {
  const session = await requirePerm("finance:record_income");

  const existing = await prisma.income.findFirst({
    where: { id: incomeId, deletedAt: null },
    select: { createdAt: true },
  });

  if (!existing) return { error: "Income record not found." };
  if (isTransactionLocked(existing.createdAt)) {
    return { error: transactionLockMessage() };
  }

  await prisma.income.update({
    where: { id: incomeId },
    data: { deletedAt: new Date() },
  });

  auditLog({ userId: session.sub, action: "DELETE_INCOME", entity: "Income", entityId: incomeId });
  revalidatePath("/transactions");
  return { success: true };
}
