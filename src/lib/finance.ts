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
