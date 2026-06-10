import { prisma } from "@/lib/db/prisma";

export async function getTotalIncomeIncludingBookingRevenue(): Promise<{
  recordedIncome: number;
  paidBookingRevenue: number;
  totalIncome: number;
}> {
  const incomeAgg = await prisma.income.aggregate({
    where: { deletedAt: null },
    _sum: { amount: true },
  });

  const recordedIncome = Number(incomeAgg._sum.amount ?? 0);

  return {
    recordedIncome,
    paidBookingRevenue: 0,
    totalIncome: recordedIncome,
  };
}

export async function getNetSavings(): Promise<number> {
  const agg = await prisma.savingsTransaction.groupBy({
    by: ["type"],
    _sum: { amount: true },
  });
  const deposits    = Number(agg.find((r) => r.type === "DEPOSIT")?._sum.amount    ?? 0);
  const withdrawals = Number(agg.find((r) => r.type === "WITHDRAWAL")?._sum.amount ?? 0);
  return deposits - withdrawals;
}

export interface SavingsStatementRow {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  narration: string;
  createdAt: Date;
  createdByName: string;
  /** Savings balance after this transaction, computed over the full history. */
  balanceAfter: number;
}

export interface SavingsStatement {
  rows: SavingsStatementRow[]; // newest first, filtered
  deposits: number;            // unfiltered totals
  withdrawals: number;
  netSavings: number;
}

/**
 * Bank-statement view of the savings account. The running balance is always
 * computed over the FULL history so it stays correct when filters are applied.
 */
export async function getSavingsStatement(filters?: {
  type?: "DEPOSIT" | "WITHDRAWAL";
  from?: Date;
  to?: Date;
}): Promise<SavingsStatement> {
  const all = await prisma.savingsTransaction.findMany({
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  let balance = 0;
  let deposits = 0;
  let withdrawals = 0;
  const withBalance: SavingsStatementRow[] = all.map((t) => {
    const amount = Number(t.amount);
    if (t.type === "DEPOSIT") {
      balance += amount;
      deposits += amount;
    } else {
      balance -= amount;
      withdrawals += amount;
    }
    return {
      id: t.id,
      type: t.type,
      amount,
      narration: t.narration,
      createdAt: t.createdAt,
      createdByName: t.createdBy.name,
      balanceAfter: balance,
    };
  });

  const rows = withBalance
    .filter((r) => {
      if (filters?.type && r.type !== filters.type) return false;
      if (filters?.from && r.createdAt < filters.from) return false;
      if (filters?.to && r.createdAt > filters.to) return false;
      return true;
    })
    .reverse(); // newest first

  return { rows, deposits, withdrawals, netSavings: balance };
}

export async function getAvailableBalance(): Promise<{
  totalIncome: number;
  totalApprovedExpenses: number;
  netSavings: number;
  availableBalance: number;
}> {
  const [incomeTotals, approvedExpAgg, netSavings] = await Promise.all([
    getTotalIncomeIncludingBookingRevenue(),
    prisma.expense.aggregate({
      where: { status: "APPROVED", deletedAt: null },
      _sum: { amount: true },
    }),
    getNetSavings(),
  ]);
  const totalApprovedExpenses = Number(approvedExpAgg._sum.amount ?? 0);
  return {
    totalIncome: incomeTotals.totalIncome,
    totalApprovedExpenses,
    netSavings,
    availableBalance: incomeTotals.totalIncome - totalApprovedExpenses - netSavings,
  };
}
