"use server";

import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function getFinancialReport(months = 6) {
  await requireStaff("FACILITY_MANAGER");  const monthlyData = await Promise.all(
    Array.from({ length: months }, (_, i) => {
      const date   = subMonths(new Date(), i);
      const start  = startOfMonth(date);
      const end    = endOfMonth(date);
      const label  = format(date, "MMM yyyy");
      return Promise.all([
        prisma.income.aggregate({
          where: { receivedAt: { gte: start, lte: end } },
          _sum: { amount: true }}),
        prisma.expense.aggregate({
          where: { status: "APPROVED", createdAt: { gte: start, lte: end } },
          _sum: { amount: true }}),
        prisma.payment.aggregate({
          where: { status: "PAID", paidAt: { gte: start, lte: end } },
          _sum: { amount: true }}),
      ]).then(([inc, exp, pay]) => ({
        label,
        income:   Number(inc._sum.amount ?? 0),
        expenses: Number(exp._sum.amount ?? 0),
        bookingRevenue: Number(pay._sum.amount ?? 0)}));
    })
  );

  // Reverse so oldest month is first
  return monthlyData.reverse();
}

export async function getBookingReport() {
  await requireStaff("FACILITY_MANAGER");  const [statusBreakdown, facilityBreakdown, recentPaid] = await Promise.all([
    prisma.booking.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { totalAmount: true }}),
    prisma.booking.groupBy({
      by: ["facilityId"],
      _count: { _all: true },
      _sum: { totalAmount: true },
      orderBy: { _count: { facilityId: "desc" } },
      take: 5}),
    prisma.payment.findMany({
      where: { status: "PAID" },
      include: { booking: { select: { title: true } }, patron: { select: { name: true } } },
      orderBy: { paidAt: "desc" },
      take: 10}),
  ]);

  // Hydrate facility names
  const facilityIds = facilityBreakdown.map((f) => f.facilityId).filter((id): id is string => id !== null);
  const facilities  = await prisma.facility.findMany({
    where: { id: { in: facilityIds } },
    select: { id: true, name: true }});
  const facilityMap = Object.fromEntries(facilities.map((f) => [f.id, f.name]));

  return {
    statusBreakdown,
    facilityBreakdown: facilityBreakdown
      .filter((f): f is typeof f & { facilityId: string } => f.facilityId !== null)
      .map((f) => ({
        ...f,
        facilityName: facilityMap[f.facilityId] ?? "Unknown"
      })),
    recentPaid
  };
}

export async function getOperationalReport() {
  await requireStaff("FACILITY_MANAGER");  const [maintenanceSummary, expenseSummary, topExpenseCategories] = await Promise.all([
    prisma.maintenanceRequest.groupBy({
      by: ["status", "priority"],
      _count: { _all: true }}),
    prisma.expense.aggregate({
      _sum: { amount: true },
      _count: { _all: true }}),
    prisma.expense.groupBy({
      by: ["category"],
      where: { status: "APPROVED" },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 6}),
  ]);

  return { maintenanceSummary, expenseSummary, topExpenseCategories };
}
