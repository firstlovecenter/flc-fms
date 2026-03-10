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
  receivedAt: z.coerce.date()});

export async function recordIncome(data: z.infer<typeof IncomeSchema>) {
  const session  = await requireStaff("FACILITY_MANAGER");  const validated = IncomeSchema.parse(data);

  const income = await prisma.income.create({
    data: { recordedById: session.sub, ...validated }});

  auditLog({ userId: session.sub, action: "RECORD_INCOME", entity: "Income", entityId: income.id });
  revalidatePath("/income");
  return { success: true, income };
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
