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
