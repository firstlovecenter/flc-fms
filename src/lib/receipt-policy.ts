import { prisma } from "@/lib/db/prisma";

/**
 * Expenses approved before this date are grandfathered and never trigger the
 * receipt-lock policy below, however long their receipt stays outstanding.
 */
export const RECEIPT_POLICY_START_DATE = new Date("2026-07-11T00:00:00.000Z");

export const RECEIPT_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

/** Whether a given approval timestamp is subject to the receipt-lock policy and overdue. */
export function isReceiptOverdue(approvedAt: Date | string | null): boolean {
  if (!approvedAt) return false;
  const approved = new Date(approvedAt);
  return approved >= RECEIPT_POLICY_START_DATE && Date.now() - approved.getTime() > RECEIPT_GRACE_PERIOD_MS;
}

/**
 * The oldest approved-but-receiptless expense (approved on/after RECEIPT_POLICY_START_DATE)
 * that has been outstanding for more than the grace period, if any. While this is set, the
 * requester who owns it may not submit new expense requests until they upload its receipt.
 */
export async function getBlockingReceiptExpense(userId: string) {
  return prisma.expense.findFirst({
    where: {
      createdById: userId,
      status: "APPROVED",
      receiptUrl: null,
      isTransactionCharge: false,
      deletedAt: null,
      approvedAt: {
        gte: RECEIPT_POLICY_START_DATE,
        lte: new Date(Date.now() - RECEIPT_GRACE_PERIOD_MS),
      },
    },
    orderBy: { approvedAt: "asc" },
    select: { id: true, title: true, amount: true, approvedAt: true },
  });
}
