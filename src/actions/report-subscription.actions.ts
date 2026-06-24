"use server";

import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";

export type ReportFrequency = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
export type ReportType =
  | "FINANCIAL"
  | "BOOKINGS"
  | "FACILITIES"
  | "INVENTORY"
  | "CEREMONY"
  | "PATRONS"
  | "MAINTENANCE";

export interface CreateSubscriptionInput {
  name:      string;
  email:     string;
  frequency: ReportFrequency;
  reports:   ReportType[];
}

export async function listReportSubscriptions() {
  await requirePerm("reports:manage_subscriptions");
  return prisma.reportSubscription.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createReportSubscription(input: CreateSubscriptionInput) {
  await requirePerm("reports:manage_subscriptions");
  if (!input.name?.trim() || !input.email?.trim()) {
    return { error: "Name and email are required." };
  }
  if (input.reports.length === 0) {
    return { error: "Select at least one report type." };
  }
  try {
    const sub = await prisma.reportSubscription.create({
      data: {
        name:      input.name.trim(),
        email:     input.email.trim().toLowerCase(),
        frequency: input.frequency,
        reports:   input.reports,
        isActive:  true,
      },
    });
    revalidatePath("/reports/subscriptions");
    return { subscription: sub };
  } catch {
    return { error: "Failed to create subscription." };
  }
}

export async function updateReportSubscription(
  id: string,
  input: Partial<CreateSubscriptionInput & { isActive: boolean }>
) {
  await requirePerm("reports:manage_subscriptions");
  try {
    const sub = await prisma.reportSubscription.update({
      where: { id },
      data: {
        ...(input.name      !== undefined ? { name:      input.name.trim() }                      : {}),
        ...(input.email     !== undefined ? { email:     input.email.trim().toLowerCase() }        : {}),
        ...(input.frequency !== undefined ? { frequency: input.frequency }                         : {}),
        ...(input.reports   !== undefined ? { reports:   input.reports }                           : {}),
        ...(input.isActive  !== undefined ? { isActive:  input.isActive }                          : {}),
      },
    });
    revalidatePath("/reports/subscriptions");
    return { subscription: sub };
  } catch {
    return { error: "Failed to update subscription." };
  }
}

export async function deleteReportSubscription(id: string) {
  await requirePerm("reports:manage_subscriptions");
  try {
    await prisma.reportSubscription.delete({ where: { id } });
    revalidatePath("/reports/subscriptions");
    return { ok: true };
  } catch {
    return { error: "Failed to delete subscription." };
  }
}

export async function toggleReportSubscription(id: string, isActive: boolean) {
  await requirePerm("reports:manage_subscriptions");
  try {
    await prisma.reportSubscription.update({ where: { id }, data: { isActive } });
    revalidatePath("/reports/subscriptions");
    return { ok: true };
  } catch {
    return { error: "Failed to toggle subscription." };
  }
}
