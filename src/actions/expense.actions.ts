"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff, requirePermission } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";
import { sendExpenseNotificationEmail } from "@/lib/notifications/email";
import { notifyExpenseDecision } from "@/lib/notifications/sms";

const ExpenseSchema = z.object({
  title:      z.string().min(2).max(200),
  narration:  z.string().min(10),
  amount:     z.coerce.number().positive(),
  category:   z.string().min(2),
  receiptUrl: z.string().url().optional()});

export async function submitExpense(data: z.infer<typeof ExpenseSchema>) {
  const session  = await requirePermission("canSubmitExpenses");  const validated = ExpenseSchema.parse(data);

  const expense = await prisma.expense.create({
    data: { createdById: session.sub, status: "PENDING", ...validated }});

  // Notify all FMs on this campus
  const managers = await prisma.user.findMany({
    where: { role: "FACILITY_MANAGER", isActive: true },
    select: { email: true, name: true }});

  for (const mgr of managers) {
    await sendExpenseNotificationEmail({ to: mgr.email, name: mgr.name,
      expenseTitle: expense.title, amount: Number(expense.amount), type: "SUBMITTED"});
  }

  auditLog({ userId: session.sub, action: "SUBMIT_EXPENSE", entity: "Expense", entityId: expense.id });
  revalidatePath("/expenses");
  return { success: true, expense };
}

export async function approveExpense(expenseId: string) {
  const session  = await requireStaff("FACILITY_MANAGER");  const expense = await prisma.expense.update({
    where: { id: expenseId, status: "PENDING" },
    data: { status: "APPROVED", approvedById: session.sub, approvedAt: new Date() },
    include: { createdBy: true }});

  if (expense.createdBy.email) {
    await sendExpenseNotificationEmail({ to: expense.createdBy.email, name: expense.createdBy.name,
      expenseTitle: expense.title, amount: Number(expense.amount), type: "APPROVED"});
  }
  if (expense.createdBy.phone) {
    await notifyExpenseDecision({ phone: expense.createdBy.phone,
      title: expense.title, approved: true});
  }

  auditLog({ userId: session.sub, action: "APPROVE_EXPENSE", entity: "Expense", entityId: expenseId });
  revalidatePath("/expenses");
  return { success: true, expense };
}

export async function rejectExpense(expenseId: string, reason: string) {
  const session  = await requireStaff("FACILITY_MANAGER");  const expense = await prisma.expense.update({
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
  revalidatePath("/expenses");
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
