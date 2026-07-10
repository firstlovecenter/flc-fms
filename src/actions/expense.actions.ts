"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";
import { getStaffAuthContext, ctxHasPermission } from "@/lib/permissions/session";
import { auditLog } from "@/lib/audit";
import { getTotalIncomeIncludingBookingRevenue } from "@/lib/finance";
import { isExpenseLocked, transactionLockMessage } from "@/lib/transaction-lock";
import { notifyFMExpenseSubmitted, notifyExpenseDecision } from "@/lib/notifications/sms";
import { staffPhonesWithPermission } from "@/lib/notifications/recipients";
import { getBlockingReceiptExpense } from "@/lib/receipt-policy";

const ExpenseSchema = z.object({
  title:      z.string().min(2).max(200),
  narration:  z.string().min(10),
  amount:     z.coerce.number().positive(),
  category:   z.string().min(2),
  receiptUrl: z.string().url().optional(),
});

const UpdateExpenseSchema = z.object({
  title:      z.string().min(2).max(200),
  narration:  z.string().min(10),
  amount:     z.coerce.number().positive(),
  category:   z.string().min(2),
  receiptUrl: z.string().url().optional(),
});

const ReceiptOnlyUpdateSchema = z.object({
  receiptUrl: z.string().url().optional(),
});

export async function submitExpense(data: z.infer<typeof ExpenseSchema>) {
  const session  = await requirePerm("finance:submit_expense");

  const blocking = await getBlockingReceiptExpense(session.sub);
  if (blocking) {
    return {
      error: `You have an approved expense ("${blocking.title}") awaiting a receipt for over 24 hours. Upload its receipt before submitting a new request.`,
    };
  }

  const validated = ExpenseSchema.parse(data);

  const expense = await prisma.expense.create({
    data: { createdById: session.sub, status: "PENDING", ...validated }});

  // Notify expense approvers via SMS
  const [managers, submitter] = await Promise.all([
    staffPhonesWithPermission("finance:approve_expense"),
    prisma.user.findUnique({ where: { id: session.sub }, select: { name: true } }),
  ]);

  for (const mgr of managers) {
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

// Advisory lock key for financial operations. Serialises concurrent expense approvals
// so the balance check and the approval update are always atomic with respect to each other.
const FINANCE_ADVISORY_LOCK = 3141592653589793n;

export async function approveExpense(expenseId: string, chargeAmount: number = 0, accountId?: string) {
  const session = await requirePerm("finance:approve_expense");

  // Sanitise charge amount — must be non-negative
  const sanitisedCharge = Math.max(0, Number(chargeAmount) || 0);

  if (!accountId) return { error: "Select which account this expense is being paid from." };
  const account = await prisma.account.findFirst({ where: { id: accountId, isActive: true } });
  if (!account) return { error: "Select a valid, active account to pay this expense from." };

  // Quick pre-flight: verify existence + lock window before entering the serialised path
  const preCheck = await prisma.expense.findFirst({
    where: { id: expenseId, status: "PENDING", deletedAt: null },
    select: { createdAt: true, amount: true },
  });
  if (!preCheck) return { error: "Expense not found or is no longer pending." };

  // Run the balance check + approval inside a transaction protected by an advisory lock.
  // pg_advisory_xact_lock releases when the transaction commits, so by the time the next
  // concurrent approval acquires the lock it will see the updated approved-expense total.
  type TxResult =
    | { updated: { createdBy: { email: string; name: string; phone: string | null }; title: string; amount: Prisma.Decimal }; appliedCharge: number }
    | { error: string };

  const txResult: TxResult = await prisma.$transaction(async (tx) => {
    const lockRows = await tx.$queryRaw<{ locked: boolean }[]>`
      SELECT pg_try_advisory_xact_lock(${FINANCE_ADVISORY_LOCK}) AS locked
    `;
    if (!lockRows[0]?.locked) {
      return { error: "Another financial operation is in progress. Please try again in a moment." };
    }

    // Re-verify inside the lock — another request may have approved it while we waited
    const current = await tx.expense.findFirst({
      where: { id: expenseId, status: "PENDING", deletedAt: null },
      select: { amount: true, title: true },
    });
    if (!current) return { error: "This expense has already been processed." };

    // Compute savings-aware available balance inside the lock
    const [incomeTotals, approvedExpAgg, savingsAgg] = await Promise.all([
      getTotalIncomeIncludingBookingRevenue(),
      tx.expense.aggregate({ where: { status: "APPROVED", deletedAt: null }, _sum: { amount: true } }),
      tx.savingsTransaction.groupBy({ by: ["type"], _sum: { amount: true } }),
    ]);

    const totalApprovedExpenses = Number(approvedExpAgg._sum.amount ?? 0);
    const savingsDeposits       = Number(savingsAgg.find((r) => r.type === "DEPOSIT")?._sum.amount    ?? 0);
    const savingsWithdrawals    = Number(savingsAgg.find((r) => r.type === "WITHDRAWAL")?._sum.amount ?? 0);
    const netSavings            = savingsDeposits - savingsWithdrawals;
    const availableBalance      = incomeTotals.totalIncome - totalApprovedExpenses - netSavings;
    const totalRequired         = Number(current.amount) + sanitisedCharge;

    if (totalRequired > availableBalance) {
      const msg = sanitisedCharge > 0
        ? `Insufficient balance. Available: GH₵${availableBalance.toFixed(2)}, Required: GH₵${totalRequired.toFixed(2)} (expense GH₵${Number(current.amount).toFixed(2)} + charge GH₵${sanitisedCharge.toFixed(2)})`
        : `Insufficient balance. Available: GH₵${availableBalance.toFixed(2)}, Expense: GH₵${Number(current.amount).toFixed(2)}`;
      return { error: msg };
    }

    const now = new Date();

    // Create charge expense first (if applicable) so we have its id
    let chargeExpenseId: string | undefined;
    if (sanitisedCharge > 0) {
      const chargeExpense = await tx.expense.create({
        data: {
          createdById:        session.sub,
          approvedById:       session.sub,
          title:              `Transaction Charge — ${current.title}`,
          narration:          `Transaction charge entered by FM on approval of "${current.title}"`,
          amount:             sanitisedCharge,
          category:           "Transaction Charge",
          status:             "APPROVED",
          isTransactionCharge: true,
          approvedAt:         now,
          accountId,
        },
        select: { id: true },
      });
      chargeExpenseId = chargeExpense.id;
    }

    const updated = await tx.expense.update({
      where: { id: expenseId },
      data: {
        status:       "APPROVED",
        approvedById: session.sub,
        approvedAt:   now,
        accountId,
        ...(chargeExpenseId ? { chargeExpenseId } : {}),
      },
      include: { createdBy: true },
    });
    return { updated, appliedCharge: sanitisedCharge };
  });

  if ("error" in txResult) return { error: txResult.error };
  const { updated, appliedCharge } = txResult;

  if (updated.createdBy.phone) {
    await notifyExpenseDecision({ phone: updated.createdBy.phone,
      title: updated.title, approved: true});
  }

  auditLog({
    userId:   session.sub,
    action:   "APPROVE_EXPENSE",
    entity:   "Expense",
    entityId: expenseId,
    after:    appliedCharge > 0 ? { chargeAmount: appliedCharge } : undefined,
  });
  revalidatePath("/transactions");
  return { success: true, expense: updated };
}

export async function rejectExpense(expenseId: string, reason: string) {
  const session  = await requirePerm("finance:approve_expense");
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, deletedAt: null },
    select: { status: true, isTransactionCharge: true },
  });

  if (!existing || existing.status !== "PENDING") {
    return { error: "Only pending expenses can be rejected." };
  }
  if (existing.isTransactionCharge) {
    return { error: "Transaction charge entries cannot be rejected." };
  }

  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data: { status: "REJECTED", approvedById: session.sub, rejectionReason: reason },
    include: { createdBy: true }});

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

  const where: Record<string, unknown> = { deletedAt: null };
  if (filters.status) where.status = filters.status;
  // Non-approvers see only their own expense requests.
  const ctx = session.role === "SUPER_ADMIN" ? null : await getStaffAuthContext(session.sub);
  const canApproveExpenses = session.role === "SUPER_ADMIN" || (ctx ? ctxHasPermission(ctx, "finance:approve_expense") : false);
  if (!canApproveExpenses) where.createdById = session.sub;

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
  const session = await getSession();
  if (!session) return { error: "Unauthorized." };

  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, deletedAt: null },
    select: { createdAt: true, status: true, createdById: true, isTransactionCharge: true },
  });

  if (!existing) return { error: "Expense record not found." };
  if (existing.isTransactionCharge) return { error: "Transaction charge entries cannot be edited." };

  const ctx = session.role === "SUPER_ADMIN" ? null : await getStaffAuthContext(session.sub);
  const canManage = session.role === "SUPER_ADMIN" || (ctx ? ctxHasPermission(ctx, "finance:approve_expense") : false);
  const isRequesterReceiptOnly =
    existing.status === "APPROVED" && existing.createdById === session.sub;

  if (!canManage && !isRequesterReceiptOnly) {
    return { error: "You are not allowed to edit this expense." };
  }

  if (canManage) {
    const validated = UpdateExpenseSchema.parse(data);
    if (isExpenseLocked(existing.createdAt, existing.status)) {
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

  const validated = ReceiptOnlyUpdateSchema.parse({ receiptUrl: data?.receiptUrl });

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: { receiptUrl: validated.receiptUrl ?? null },
  });

  auditLog({
    userId: session.sub,
    action: "UPDATE_EXPENSE_RECEIPT",
    entity: "Expense",
    entityId: expenseId,
  });
  revalidatePath("/transactions");
  return { success: true, expense: updated };
}

export async function deleteExpense(expenseId: string) {
  const session = await requirePerm("finance:approve_expense");

  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, deletedAt: null },
    select: { createdAt: true, status: true, isTransactionCharge: true },
  });

  if (!existing) return { error: "Expense record not found." };
  if (existing.isTransactionCharge) return { error: "Transaction charge entries cannot be deleted." };
  if (isExpenseLocked(existing.createdAt, existing.status)) {
    return { error: transactionLockMessage() };
  }

  await prisma.expense.update({
    where: { id: expenseId },
    data: { deletedAt: new Date() },
  });

  auditLog({ userId: session.sub, action: "DELETE_EXPENSE", entity: "Expense", entityId: expenseId });
  revalidatePath("/transactions");
  return { success: true };
}
