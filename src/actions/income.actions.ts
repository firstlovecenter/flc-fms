"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";

const IncomeSchema = z.object({
  title:      z.string().min(2),
  narration:  z.string().min(10),
  amount:     z.coerce.number().positive(),
  category:   z.string().min(2),
  source:     z.string().optional(),
  bookingId:  z.string().optional(),
  receivedAt: z.coerce.date()});

export async function recordIncome(data: z.infer<typeof IncomeSchema>) {
  const session  = await requireStaff("FACILITY_MANAGER");  const validated = IncomeSchema.parse(data);

  const income = await prisma.income.create({
    data: { recordedById: session.sub, ...validated }});

  // If linked to a booking, mark the booking as PAID
  if (validated.bookingId) {
    await prisma.booking.update({
      where: { id: validated.bookingId },
      data: { paymentStatus: "PAID" },
    });
  }

  auditLog({ userId: session.sub, action: "RECORD_INCOME", entity: "Income", entityId: income.id });
  revalidatePath("/transactions");
  revalidatePath("/bookings");
  return { success: true, income };
}

/** Auto-record income when a payment succeeds (called from webhooks, no session) */
export async function autoRecordPaymentIncome(opts: {
  bookingId: string;
  bookingTitle: string;
  amount: number;
  provider: string;
  facilityName?: string;
}) {
  // Skip if income already recorded for this booking
  const existing = await prisma.income.findUnique({ where: { bookingId: opts.bookingId } });
  if (existing) return existing;

  const income = await prisma.income.create({
    data: {
      bookingId:  opts.bookingId,
      title:      `Facility Hire — ${opts.bookingTitle}`,
      narration:  `Payment received for booking via ${opts.provider}${opts.facilityName ? ` (${opts.facilityName})` : ""}`,
      amount:     opts.amount,
      category:   "Facility Hire",
      source:     opts.provider,
      receivedAt: new Date(),
    },
  });

  auditLog({ action: "AUTO_RECORD_INCOME", entity: "Income", entityId: income.id, after: { bookingId: opts.bookingId, provider: opts.provider } });
  return income;
}

export async function getBookingsForIncomeLink() {
  await requireStaff("FACILITY_MANAGER");
  // Return bookings that don't already have a linked income record
  const bookings = await prisma.booking.findMany({
    where: {
      income: null,
      status: { in: ["APPROVED", "COMPLETED"] },
    },
    select: { id: true, title: true, totalAmount: true, startTime: true, facility: { select: { name: true } } },
    orderBy: { startTime: "desc" },
    take: 50,
  });
  return bookings;
}

export async function getIncomeSummary() {
  await requireStaff();  const [records, monthly] = await Promise.all([
    prisma.income.findMany({
      where: {},
      include: { recordedBy: { select: { name: true } } },
      orderBy: { receivedAt: "desc" },
      take: 50}),
    prisma.income.groupBy({
      by: ["category"],
      where: {},
      _sum: { amount: true },
      _count: true}),
  ]);

  return { records, monthly };
}
