import { endOfWeek, startOfDay, startOfWeek } from "date-fns";
import { prisma } from "@/lib/db/prisma";

export const WEEK_STARTS_ON = 1 as const; // Monday

export const DUTY_LOG_INCLUDE = {
  template: { select: { id: true, name: true, type: true } },
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  supervisor: { select: { id: true, name: true } },
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      signedBy: { select: { id: true, name: true } },
    },
  },
} as const;

export async function getDutyLogsForDate(
  date: Date,
  options?: { assignedToId?: string },
) {
  const dayStart = startOfDay(date);

  return prisma.dutyLog.findMany({
    where: {
      date: dayStart,
      ...(options?.assignedToId ? { assignedToId: options.assignedToId } : {}),
    },
    include: DUTY_LOG_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
}

export async function getDutyLogsForWeek(anchorDate: Date) {
  const weekStart = startOfWeek(anchorDate, { weekStartsOn: WEEK_STARTS_ON });
  const weekEnd = endOfWeek(anchorDate, { weekStartsOn: WEEK_STARTS_ON });

  return prisma.dutyLog.findMany({
    where: {
      date: { gte: weekStart, lte: weekEnd },
    },
    include: DUTY_LOG_INCLUDE,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
}

export async function getDutyLogById(id: string) {
  return prisma.dutyLog.findUnique({
    where: { id },
    include: DUTY_LOG_INCLUDE,
  });
}

export async function getActiveStaffForDuty() {
  return prisma.user.findMany({
    where: { isActive: true, role: { notIn: ["SUPER_ADMIN", "PATRON"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function getDutyTemplates() {
  return prisma.dutyTemplate.findMany({
    where: { isActive: true },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getDutyTemplateById(id: string) {
  return prisma.dutyTemplate.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      _count: { select: { dutyLogs: true } },
    },
  });
}

export async function getAllDutyTemplates() {
  return prisma.dutyTemplate.findMany({
    include: {
      _count: { select: { items: true, dutyLogs: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
}
