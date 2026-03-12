import { prisma } from "@/lib/db/prisma";

export async function getTotalIncomeIncludingBookingRevenue(): Promise<{
  recordedIncome: number;
  paidBookingRevenue: number;
  totalIncome: number;
}> {
  const linkedBookingIncome = await prisma.income.findMany({
    where: { bookingId: { not: null } },
    select: { bookingId: true },
  });

  const linkedBookingIds = linkedBookingIncome
    .map((entry) => entry.bookingId)
    .filter((bookingId): bookingId is string => Boolean(bookingId));

  const [incomeAgg, bookingPaymentAgg] = await Promise.all([
    prisma.income.aggregate({ _sum: { amount: true } }),
    prisma.payment.aggregate({
      where: {
        status: "PAID",
        ...(linkedBookingIds.length > 0
          ? { NOT: { bookingId: { in: linkedBookingIds } } }
          : {}),
      },
      _sum: { amount: true },
    }),
  ]);

  const recordedIncome = Number(incomeAgg._sum.amount ?? 0);
  const paidBookingRevenue = Number(bookingPaymentAgg._sum.amount ?? 0);

  return {
    recordedIncome,
    paidBookingRevenue,
    totalIncome: recordedIncome + paidBookingRevenue,
  };
}
