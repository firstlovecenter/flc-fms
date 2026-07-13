"use server";

import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/guards";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { resolveDateRange } from "@/lib/reports/utils";
import type { DateRange } from "@/lib/reports/utils";

export type { ReportPeriod, DateRange } from "@/lib/reports/utils";

// ── Financial ─────────────────────────────────────────────────────────────────

export async function getFinancialReport(range?: DateRange) {
  await requirePerm("reports:view");

  const { from, to } = range ?? resolveDateRange("6m");

  // Build monthly buckets spanning the range
  const months: Date[] = [];
  let cursor = startOfMonth(from);
  while (cursor <= to) {
    months.push(cursor);
    cursor = startOfMonth(subMonths(cursor, -1)); // next month
  }

  const monthlyData = await Promise.all(
    months.map((date) => {
      const start = startOfMonth(date);
      const end   = endOfMonth(date);
      const label = format(date, "MMM yyyy");
      return Promise.all([
        prisma.income.aggregate({
          where: { receivedAt: { gte: start, lte: end }, deletedAt: null },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { status: "APPROVED", createdAt: { gte: start, lte: end }, deletedAt: null },
          _sum: { amount: true },
        }),
        prisma.booking.aggregate({
          where: {
            status: { in: ["APPROVED", "COMPLETED"] },
            createdAt: { gte: start, lte: end },
            deletedAt: null,
          },
          _sum: { totalAmount: true },
        }),
      ]).then(([inc, exp, bk]) => ({
        label,
        income:         Number(inc._sum.amount ?? 0),
        expenses:       Number(exp._sum.amount ?? 0),
        bookingRevenue: Number(bk._sum.totalAmount ?? 0),
      }));
    })
  );

  const [incomeByCategory, expenseByCategory] = await Promise.all([
    prisma.income.groupBy({
      by: ["category"],
      where: { receivedAt: { gte: from, lte: to }, deletedAt: null },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { status: "APPROVED", createdAt: { gte: from, lte: to }, deletedAt: null },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 8,
    }),
  ]);

  return {
    monthly: monthlyData,
    incomeByCategory: incomeByCategory.map((c) => ({
      category: c.category,
      total: Number(c._sum.amount ?? 0),
      count: c._count._all,
    })),
    expenseByCategory: expenseByCategory.map((c) => ({
      category: c.category,
      total: Number(c._sum.amount ?? 0),
      count: c._count._all,
    })),
  };
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export async function getBookingReport(range?: DateRange) {
  await requirePerm("reports:view");

  const { from, to } = range ?? resolveDateRange("6m");

  const [statusBreakdown, facilityBreakdown, categoryBreakdown] = await Promise.all([
    prisma.booking.groupBy({
      by: ["status"],
      where: { createdAt: { gte: from, lte: to }, deletedAt: null },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    prisma.booking.groupBy({
      by: ["facilityId"],
      where: { createdAt: { gte: from, lte: to }, deletedAt: null, facilityId: { not: null } },
      _count: { _all: true },
      _sum: { totalAmount: true },
      orderBy: { _count: { facilityId: "desc" } },
      take: 8,
    }),
    prisma.booking.groupBy({
      by: ["category"],
      where: { createdAt: { gte: from, lte: to }, deletedAt: null },
      _count: { _all: true },
      _sum: { totalAmount: true },
      orderBy: { _count: { category: "desc" } },
    }),
  ]);

  const facilityIds = facilityBreakdown
    .map((f) => f.facilityId)
    .filter((id): id is string => id !== null);
  const facilities  = await prisma.facility.findMany({
    where: { id: { in: facilityIds } },
    select: { id: true, name: true },
  });
  const facilityMap = Object.fromEntries(facilities.map((f) => [f.id, f.name]));

  // avg booking value for APPROVED/COMPLETED
  const avgResult = await prisma.booking.aggregate({
    where: { status: { in: ["APPROVED", "COMPLETED"] }, createdAt: { gte: from, lte: to }, deletedAt: null },
    _avg: { totalAmount: true },
    _count: { _all: true },
  });

  return {
    statusBreakdown: statusBreakdown.map((b) => ({
      status: b.status,
      count: b._count._all,
      revenue: Number(b._sum.totalAmount ?? 0),
    })),
    facilityBreakdown: facilityBreakdown
      .filter((f): f is typeof f & { facilityId: string } => f.facilityId !== null)
      .map((f) => ({
        facilityId:   f.facilityId,
        facilityName: facilityMap[f.facilityId] ?? "Unknown",
        count:        f._count._all,
        revenue:      Number(f._sum.totalAmount ?? 0),
      })),
    categoryBreakdown: categoryBreakdown.map((c) => ({
      category: c.category,
      count:    c._count._all,
      revenue:  Number(c._sum.totalAmount ?? 0),
    })),
    avgValue: Number(avgResult._avg.totalAmount ?? 0),
    totalPaid: avgResult._count._all,
  };
}

// ── Facilities ────────────────────────────────────────────────────────────────

export async function getFacilitiesReport(range?: DateRange) {
  await requirePerm("reports:view");

  const { from, to } = range ?? resolveDateRange("6m");

  const [facilities, bookingsByFacility, maintenanceCosts] = await Promise.all([
    prisma.facility.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, capacity: true, underMaintenance: true, isActive: true },
    }),
    prisma.booking.groupBy({
      by: ["facilityId"],
      where: {
        facilityId: { not: null },
        status: { in: ["APPROVED", "COMPLETED"] },
        createdAt: { gte: from, lte: to },
        deletedAt: null,
      },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    prisma.maintenanceRequest.groupBy({
      by: ["facilityId"],
      where: { facilityId: { not: null }, createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    }),
  ]);

  const bookMap = Object.fromEntries(
    bookingsByFacility
      .filter((b): b is typeof b & { facilityId: string } => b.facilityId !== null)
      .map((b) => [b.facilityId, { count: b._count._all, revenue: Number(b._sum.totalAmount ?? 0) }])
  );
  const maintMap = Object.fromEntries(
    maintenanceCosts
      .filter((m): m is typeof m & { facilityId: string } => m.facilityId !== null)
      .map((m) => [m.facilityId, m._count._all])
  );

  const maxBookings = Math.max(...facilities.map((f) => bookMap[f.id]?.count ?? 0), 1);

  return facilities.map((f) => ({
    id:              f.id,
    name:            f.name,
    capacity:        f.capacity,
    isActive:        f.isActive,
    underMaintenance: f.underMaintenance,
    bookings:        bookMap[f.id]?.count ?? 0,
    revenue:         bookMap[f.id]?.revenue ?? 0,
    utilizationPct:  Math.round(((bookMap[f.id]?.count ?? 0) / maxBookings) * 100),
    maintenanceCount: maintMap[f.id] ?? 0,
  }));
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export async function getInventoryReport(range?: DateRange) {
  await requirePerm("reports:view");

  const { from, to } = range ?? resolveDateRange("6m");

  const [conditionBreakdown, statusBreakdown, checkoutTrend, overdueItems] = await Promise.all([
    prisma.inventoryItem.groupBy({
      by: ["condition"],
      where: { isActive: true },
      _count: { _all: true },
    }),
    prisma.inventoryItem.groupBy({
      by: ["status"],
      where: { isActive: true },
      _count: { _all: true },
    }),
    // monthly checkout counts
    prisma.inventoryCheckout.findMany({
      where: { checkedOutAt: { gte: from, lte: to } },
      select: { checkedOutAt: true, quantity: true },
    }),
    prisma.inventoryCheckout.findMany({
      where: {
        returnedAt: null,
        dueBack: { lt: new Date() },
      },
      select: { id: true, itemId: true, dueBack: true, quantity: true, item: { select: { name: true } } },
      take: 20,
    }),
  ]);

  // Bucket checkouts by month
  const checkoutByMonth: Record<string, number> = {};
  for (const c of checkoutTrend) {
    const key = format(c.checkedOutAt, "MMM yyyy");
    checkoutByMonth[key] = (checkoutByMonth[key] ?? 0) + c.quantity;
  }

  const totalItems    = await prisma.inventoryItem.count({ where: { isActive: true } });
  const checkedOut    = statusBreakdown.find((s) => s.status === "CHECKED_OUT")?._count._all ?? 0;
  const underMaintenance = statusBreakdown.find((s) => s.status === "UNDER_MAINTENANCE")?._count._all ?? 0;

  return {
    totalItems,
    checkedOut,
    overdue: overdueItems.length,
    underMaintenance,
    conditionBreakdown: conditionBreakdown.map((c) => ({ condition: c.condition, count: c._count._all })),
    statusBreakdown:    statusBreakdown.map((s) => ({ status: s.status, count: s._count._all })),
    checkoutByMonth: Object.entries(checkoutByMonth).map(([label, count]) => ({ label, count })),
    overdueItems: overdueItems.map((o) => ({
      id: o.id,
      name: o.item.name,
      quantity: o.quantity,
      dueBack: o.dueBack,
    })),
  };
}

// ── Ceremony ──────────────────────────────────────────────────────────────────

export async function getCeremonyReport(range?: DateRange) {
  await requirePerm("reports:view");

  const { from, to } = range ?? resolveDateRange("6m");

  const [statusBreakdown, typeBreakdown, venueRevenue] = await Promise.all([
    prisma.ceremonyBookingCode.groupBy({
      by: ["status"],
      where: { createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    }),
    prisma.ceremonyBookingCode.groupBy({
      by: ["ceremonyType"],
      where: { createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    }),
    prisma.ceremonyBookingCode.groupBy({
      by: ["facilityId"],
      where: { createdAt: { gte: from, lte: to }, facilityId: { not: null } },
      _sum: { amountPaid: true },
      _count: { _all: true },
    }),
  ]);

  const total      = statusBreakdown.reduce((s, b) => s + b._count._all, 0);
  const activated  = statusBreakdown.find((s) => s.status === "ACTIVE")?._count._all ?? 0;
  const used       = statusBreakdown.find((s) => s.status === "USED")?._count._all ?? 0;
  const expired    = statusBreakdown.find((s) => s.status === "EXPIRED")?._count._all ?? 0;
  const pending    = statusBreakdown.find((s) => s.status === "PENDING")?._count._all ?? 0;

  const venueIds = venueRevenue.map((v) => v.facilityId).filter((id): id is string => !!id);
  const venues = await prisma.facility.findMany({
    where: { id: { in: venueIds } },
    select: { id: true, name: true },
  });
  const venueNames = new Map(venues.map((v) => [v.id, v.name]));

  const revenueByVenue = venueRevenue
    .map((v) => ({
      facilityId:   v.facilityId!,
      facilityName: venueNames.get(v.facilityId!) ?? "Unknown venue",
      totalPaid:    Number(v._sum.amountPaid ?? 0),
      count:        v._count._all,
    }))
    .sort((a, b) => b.totalPaid - a.totalPaid);

  return {
    total,
    pending,
    activated,
    used,
    expired,
    conversionRate: total > 0 ? Math.round((used / total) * 100) : 0,
    statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count._all })),
    typeBreakdown: typeBreakdown.map((t) => ({ type: t.ceremonyType, count: t._count._all })),
    revenueByVenue,
    totalRevenue: revenueByVenue.reduce((s, v) => s + v.totalPaid, 0),
  };
}

// ── Patrons ───────────────────────────────────────────────────────────────────

export async function getPatronsReport(range?: DateRange) {
  await requirePerm("reports:view");

  const { from, to } = range ?? resolveDateRange("6m");

  const [allPatrons, verifiedCount, activePatrons] = await Promise.all([
    prisma.patron.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
    }),
    prisma.patron.count({ where: { isVerified: true } }),
    // patrons with at least one booking in range
    prisma.patron.count({
      where: {
        bookings: {
          some: {
            createdAt: { gte: from, lte: to },
            deletedAt: null,
          },
        },
      },
    }),
  ]);

  const total = await prisma.patron.count();

  // Group registrations by month
  const regByMonth: Record<string, number> = {};
  for (const p of allPatrons) {
    const key = format(p.createdAt, "MMM yyyy");
    regByMonth[key] = (regByMonth[key] ?? 0) + 1;
  }

  return {
    total,
    newInRange:     allPatrons.length,
    verified:       verifiedCount,
    unverified:     total - verifiedCount,
    activeInRange:  activePatrons,
    inactiveInRange: total - activePatrons,
    registrationsByMonth: Object.entries(regByMonth).map(([label, count]) => ({ label, count })),
  };
}

// ── Maintenance ───────────────────────────────────────────────────────────────

export async function getMaintenanceReport(range?: DateRange) {
  await requirePerm("reports:view");

  const { from, to } = range ?? resolveDateRange("6m");

  const [statusBreakdown, priorityBreakdown, expenseSummary] = await Promise.all([
    prisma.maintenanceRequest.groupBy({
      by: ["status"],
      where: { createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    }),
    prisma.maintenanceRequest.groupBy({
      by: ["priority"],
      where: { createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    }),
    prisma.expense.aggregate({
      where: {
        maintenanceRequestId: { not: null },
        status: "APPROVED",
        createdAt: { gte: from, lte: to },
        deletedAt: null,
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  // Avg resolution time for RESOLVED/CLOSED tickets in range
  const resolvedRequests = await prisma.maintenanceRequest.findMany({
    where: {
      status: { in: ["RESOLVED", "CLOSED"] },
      createdAt: { gte: from, lte: to },
      resolvedAt: { not: null },
    },
    select: { createdAt: true, resolvedAt: true },
  });

  const avgResolutionHours =
    resolvedRequests.length > 0
      ? resolvedRequests.reduce((sum, r) => {
          const hrs = (r.resolvedAt!.getTime() - r.createdAt.getTime()) / 3_600_000;
          return sum + hrs;
        }, 0) / resolvedRequests.length
      : 0;

  return {
    statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count._all })),
    priorityBreakdown: priorityBreakdown.map((p) => ({ priority: p.priority, count: p._count._all })),
    totalMaintenanceCost:  Number(expenseSummary._sum.amount ?? 0),
    linkedExpenseCount:    expenseSummary._count._all,
    avgResolutionHours:    Math.round(avgResolutionHours),
    resolvedCount:         resolvedRequests.length,
  };
}

// ── Legacy / compatibility exports (reports page still uses these names) ──────

export async function getOperationalReport() {
  await requirePerm("reports:view");
  const [maintenanceSummary, expenseSummary, topExpenseCategories] = await Promise.all([
    prisma.maintenanceRequest.groupBy({
      by: ["status", "priority"],
      _count: { _all: true },
    }),
    prisma.expense.aggregate({
      where: { deletedAt: null },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { status: "APPROVED", deletedAt: null },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 6,
    }),
  ]);
  return { maintenanceSummary, expenseSummary, topExpenseCategories };
}
