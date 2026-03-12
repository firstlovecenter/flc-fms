"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";
import { getTotalIncomeIncludingBookingRevenue } from "@/lib/finance";
import { sendExpenseNotificationEmail } from "@/lib/notifications/email";
import { notifyExpenseDecision, notifyFMExpenseSubmitted } from "@/lib/notifications/sms";
import { isTransactionLocked, transactionLockMessage } from "@/lib/transaction-lock";

const ExpenseSchema = z.object({
  title:      z.string().min(2).max(200),
  narration:  z.string().min(10),
  amount:     z.coerce.number().positive(),
  category:   z.string().min(2),
});

const UpdateExpenseSchema = z.object({
  title:      z.string().min(2).max(200),
  narration:  z.string().min(10),
  amount:     z.coerce.number().positive(),
  category:   z.string().min(2),
});

export async function submitExpense(data: z.infer<typeof ExpenseSchema>) {
  const session  = await requireStaff("FACILITY_MANAGER");
  const validated = ExpenseSchema.parse(data);

  const expense = await prisma.expense.create({
    data: { createdById: session.sub, status: "PENDING", ...validated }});

  // Notify all FMs by email + SMS
  const [managers, submitter] = await Promise.all([
    prisma.user.findMany({
      where: { role: "FACILITY_MANAGER", isActive: true },
      select: { email: true, name: true, phone: true },
    }),
    prisma.user.findUnique({ where: { id: session.sub }, select: { name: true } }),
  ]);

  for (const mgr of managers) {
    await sendExpenseNotificationEmail({ to: mgr.email, name: mgr.name,
      expenseTitle: expense.title, amount: Number(expense.amount), type: "SUBMITTED" });
    if (mgr.phone) {
      await notifyFMExpenseSubmitted({
        phone: mgr.phone,
        submittedBy: submitter?.name ?? "Staff",
        title: expense.title,
        amount: Number(expense.amount),
      });
    }
  }

  auditLog({ userId: session.sub, action: "SUBMIT_EXPENSE", entity: "Expense", entityId: expense.id });
  revalidatePath("/transactions");
  return { success: true, expense };
}

export async function approveExpense(expenseId: string) {
  const session  = await requireStaff("FACILITY_MANAGER");

  // Check account balance before approving
  const expense = await prisma.expense.findUniqueOrThrow({
    where: { id: expenseId, status: "PENDING" },
  });

  if (isTransactionLocked(expense.createdAt)) {
    return { error: transactionLockMessage() };
  }

  const [incomeTotals, totalApprovedExpenses] = await Promise.all([
    getTotalIncomeIncludingBookingRevenue(),
    prisma.expense.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true } }),
  ]);

  const balance =
    incomeTotals.totalIncome -
    Number(totalApprovedExpenses._sum.amount ?? 0);

  if (Number(expense.amount) > balance) {
    return {
      error: `Insufficient balance. Available: GH₵${balance.toFixed(2)}, Expense: GH₵${Number(expense.amount).toFixed(2)}`,
    };
  }

  const updated = await prisma.expense.update({
    where: { id: expenseId, status: "PENDING" },
    data: { status: "APPROVED", approvedById: session.sub, approvedAt: new Date() },
    include: { createdBy: true }});

  if (updated.createdBy.email) {
    await sendExpenseNotificationEmail({ to: updated.createdBy.email, name: updated.createdBy.name,
      expenseTitle: updated.title, amount: Number(updated.amount), type: "APPROVED"});
  }
  if (updated.createdBy.phone) {
    await notifyExpenseDecision({ phone: updated.createdBy.phone,
      title: updated.title, approved: true});
  }

  auditLog({ userId: session.sub, action: "APPROVE_EXPENSE", entity: "Expense", entityId: expenseId });
  revalidatePath("/transactions");
  return { success: true, expense: updated };
}

export async function rejectExpense(expenseId: string, reason: string) {
  const session  = await requireStaff("FACILITY_MANAGER");
  const existing = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: { createdAt: true, status: true },
  });

  if (!existing || existing.status !== "PENDING") {
    return { error: "Only pending expenses can be rejected." };
  }
  if (isTransactionLocked(existing.createdAt)) {
    return { error: transactionLockMessage() };
  }

  const expense = await prisma.expense.update({
    where: { id: expenseId, status: "PENDING" },
    data: { status: "REJECTED", approvedById: session.sub, rejectionReason: reason },
    include: { createdBy: true }});

  if (expense.createdBy.email) {
    await sendExpenseNotificationEmail({ to: expense.createdBy.email, name: expense.createdBy.name,
      expenseTitle: expense.title, amount: Number(expense.amount), type: "REJECTED", reason});
  }
  if (expense.createdBy.phone) {
    await notifyExpenseDecision({ phone: expense.createdBy.phone,
      title: expense.title, approved: false, reason});
  }

  auditLog({ userId: session.sub, action: "REJECT_EXPENSE", entity: "Expense", entityId: expenseId, after: { reason } });
  revalidatePath("/transactions");
  return { success: true };
}

export async function getExpenses(filters: { status?: string; page?: number } = {}) {
  const session  = await getSession();
  if (!session) return { expenses: [], total: 0 };  const page = filters.page ?? 1;
  const take = 20;

  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  // Vicars see only their own
  if (session.role === "VICAR") where.createdById = session.sub;

  const [expenses, total] = await prisma.$transaction([
    prisma.expense.findMany({
      where,
      include: {
        createdBy:  { select: { name: true } },
        approvedBy: { select: { name: true } }},
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take}),
    prisma.expense.count({ where }),
  ]);

  return { expenses, total, page, pages: Math.ceil(total / take) };
}

export async function updateExpense(expenseId: string, data: z.infer<typeof UpdateExpenseSchema>) {
  const session = await requireStaff("FACILITY_MANAGER");
  const validated = UpdateExpenseSchema.parse(data);

  const existing = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: { createdAt: true },
  });

  if (!existing) return { error: "Expense record not found." };
  if (isTransactionLocked(existing.createdAt)) {
    return { error: transactionLockMessage() };
  }

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: validated,
  });

  auditLog({ userId: session.sub, action: "UPDATE_EXPENSE", entity: "Expense", entityId: expenseId });
  revalidatePath("/transactions");
  return { success: true, expense: updated };
}

export async function deleteExpense(expenseId: string) {
  const session = await requireStaff("FACILITY_MANAGER");

  const existing = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: { createdAt: true },
  });

  if (!existing) return { error: "Expense record not found." };
  if (isTransactionLocked(existing.createdAt)) {
    return { error: transactionLockMessage() };
  }

  await prisma.expense.delete({ where: { id: expenseId } });

  auditLog({ userId: session.sub, action: "DELETE_EXPENSE", entity: "Expense", entityId: expenseId });
  revalidatePath("/transactions");
  return { success: true };
}
