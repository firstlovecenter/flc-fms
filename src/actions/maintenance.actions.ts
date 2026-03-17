"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff, requirePermission } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { notifyMaintenanceUpdate, notifyFMMaintenanceRequested } from "@/lib/notifications/sms";
import { sendMaintenanceOpenedEmail, sendExpenseNotificationEmail } from "@/lib/notifications/email";

const CreateSchema = z.object({
  facilityId:     z.string().optional(),
  title:          z.string().min(2).max(200),
  description:    z.string().min(5),
  priority:       z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  scheduledStart: z.coerce.date().optional(),
  scheduledEnd:   z.coerce.date().optional(),
  estimatedCost:  z.coerce.number().positive().optional(),
}).refine(
  (d) => !d.scheduledStart || !d.scheduledEnd || d.scheduledEnd > d.scheduledStart,
  { message: "Scheduled end must be after scheduled start", path: ["scheduledEnd"] }
);

const UpdateSchema = z.object({
  status:       z.enum(["IN_PROGRESS", "RESOLVED", "CLOSED"]),
  assignedToId: z.string().min(1).optional(),
  actualCost:   z.coerce.number().positive().optional(),
});

/** Shared helper — builds the expense title from facility name */
function expenseTitle(facilityName: string | null | undefined) {
  return `Maintenance — ${facilityName ?? "General"}`;
}

/** Shared helper — notifies all active FMs about a new/updated expense */
async function notifyFMsNewExpense(
  expenseTitle: string,
  amount: number,
  fms: Array<{ email: string; name: string }>
) {
  for (const mgr of fms) {
    await sendExpenseNotificationEmail({
      to: mgr.email,
      name: mgr.name,
      expenseTitle,
      amount,
      type: "SUBMITTED",
    });
  }
}

export async function createMaintenanceRequest(data: z.infer<typeof CreateSchema>) {
  await requireStaff("FACILITY_MANAGER", "VICAR");
  const session   = await requirePermission("canCreateMaintenance");
  const validated = CreateSchema.parse(data);

  const isScheduled = !!(validated.scheduledStart && validated.scheduledEnd);
  const isEmergency = !isScheduled;

  const request = await prisma.maintenanceRequest.create({
    data: {
      requestedById:  session.sub,
      status:         "OPEN",
      facilityId:     validated.facilityId ?? null,
      title:          validated.title,
      description:    validated.description,
      priority:       validated.priority,
      scheduledStart: validated.scheduledStart ?? null,
      scheduledEnd:   validated.scheduledEnd ?? null,
      estimatedCost:  validated.estimatedCost ?? null,
    },
  });

  // Only hard-lock the facility for unscheduled (emergency) maintenance
  if (validated.facilityId && isEmergency) {
    await prisma.facility.update({
      where: { id: validated.facilityId },
      data:  { underMaintenance: true },
    });
  }

  // Fetch FMs, facility name, reporter name in parallel
  const [fms, facility, reporter] = await Promise.all([
    prisma.user.findMany({
      where:  { role: "FACILITY_MANAGER", isActive: true },
      select: { email: true, name: true, phone: true },
    }),
    validated.facilityId
      ? prisma.facility.findUnique({ where: { id: validated.facilityId }, select: { name: true } })
      : Promise.resolve(null),
    prisma.user.findUnique({ where: { id: session.sub }, select: { name: true } }),
  ]);

  // Notify FMs via SMS + email
  for (const fm of fms) {
    if (fm.phone) {
      await notifyFMMaintenanceRequested({
        phone:        fm.phone,
        requestedBy:  reporter?.name ?? "Staff",
        title:        validated.title,
        priority:     validated.priority,
        facilityName: facility?.name,
      });
    }
    if (validated.facilityId && facility) {
      await sendMaintenanceOpenedEmail({
        to:           fm.email,
        fmName:       fm.name,
        facilityName: facility.name,
        requestTitle: validated.title,
        priority:     validated.priority ?? "MEDIUM",
        reportedBy:   reporter?.name ?? "Staff",
      });
    }
  }

  // ── Auto-create a PENDING expense when an estimated cost is provided ──────
  // This puts the cost into the expense approval queue immediately, so the FM
  // can see it under Transactions → Expenses before the work is completed.
  if (validated.estimatedCost && validated.estimatedCost > 0) {
    const title = expenseTitle(facility?.name);
    const expense = await prisma.expense.create({
      data: {
        createdById:         session.sub,
        maintenanceRequestId: request.id,
        status:              "PENDING",
        title,
        narration:           `Estimated cost for maintenance request: ${validated.title} (ID: ${request.id})`,
        amount:              validated.estimatedCost,
        category:            "Maintenance & Repairs",
      },
    });

    await notifyFMsNewExpense(title, validated.estimatedCost, fms);
    auditLog({
      userId: session.sub,
      action: "AUTO_CREATE_EXPENSE",
      entity: "Expense",
      entityId: expense.id,
      after: { maintenanceRequestId: request.id, trigger: "estimatedCost" },
    });
  }

  auditLog({ userId: session.sub, action: "CREATE_MAINTENANCE", entity: "MaintenanceRequest", entityId: request.id });
  revalidatePath("/maintenance");
  revalidatePath("/transactions");
  return { success: true, request };
}

export async function updateMaintenanceRequest(
  requestId: string,
  data: z.infer<typeof UpdateSchema>
) {
  const session   = await requireStaff("FACILITY_MANAGER");
  const validated = UpdateSchema.parse(data);

  const request = await prisma.maintenanceRequest.update({
    where: { id: requestId },
    data: {
      status:     validated.status,
      assignedToId: validated.assignedToId,
      actualCost: validated.actualCost ?? undefined,
      resolvedAt: validated.status === "RESOLVED" ? new Date() : undefined,
      closedAt:   validated.status === "CLOSED"   ? new Date() : undefined,
    },
    include: {
      facility:   { select: { id: true, name: true } },
      assignedTo: { select: { phone: true } },
    },
  });

  // Unlock facility hard-lock when resolved or closed
  if (["RESOLVED", "CLOSED"].includes(validated.status) && request.facility) {
    await prisma.facility.update({
      where: { id: request.facility.id },
      data:  { underMaintenance: false },
    });
  }

  // Notify assigned staff
  if (request.assignedTo?.phone && request.facility) {
    await notifyMaintenanceUpdate({
      phone:        request.assignedTo.phone,
      requestId:    request.id,
      facilityName: request.facility.name,
      status:       validated.status,
    });
  }

  // ── Upsert expense when actualCost is confirmed ───────────────────────────
  // If an expense was already created from the estimatedCost, update its
  // amount to reflect the real cost. If none exists yet, create one now.
  if (validated.actualCost && validated.actualCost > 0) {
    const title = expenseTitle(request.facility?.name);
    const narration = `Actual cost for maintenance request: ${request.title} (ID: ${requestId})`;

    const expense = await prisma.expense.upsert({
      where:  { maintenanceRequestId: requestId },
      update: { amount: validated.actualCost, narration },
      create: {
        createdById:         session.sub,
        maintenanceRequestId: requestId,
        status:              "PENDING",
        title,
        narration,
        amount:              validated.actualCost,
        category:            "Maintenance & Repairs",
      },
    });

    // Notify FMs if a brand-new expense was just created (no estimatedCost was set before)
    const wasJustCreated = expense.createdAt.getTime() > Date.now() - 5000;
    if (wasJustCreated) {
      const fms = await prisma.user.findMany({
        where:  { role: "FACILITY_MANAGER", isActive: true },
        select: { email: true, name: true },
      });
      await notifyFMsNewExpense(title, validated.actualCost, fms);
    }

    auditLog({
      userId: session.sub,
      action: "UPSERT_MAINTENANCE_EXPENSE",
      entity: "Expense",
      entityId: expense.id,
      after: { maintenanceRequestId: requestId, actualCost: validated.actualCost },
    });
  }

  auditLog({
    userId: session.sub,
    action: "UPDATE_MAINTENANCE",
    entity: "MaintenanceRequest",
    entityId: requestId,
    after: validated,
  });
  revalidatePath("/maintenance");
  revalidatePath("/transactions");
  return { success: true, request };
}

export async function getMaintenanceRequests(filters: {
  status?: string;
  priority?: string;
  facilityId?: string;
  page?: number;
} = {}) {
  await requireStaff("FACILITY_MANAGER", "VICAR");
  const page = filters.page ?? 1;
  const take = 20;

  const where: Record<string, unknown> = {};
  if (filters.status)     where.status     = filters.status;
  if (filters.priority)   where.priority   = filters.priority;
  if (filters.facilityId) where.facilityId = filters.facilityId;

  const [requests, total] = await prisma.$transaction([
    prisma.maintenanceRequest.findMany({
      where,
      include: {
        facility:    { select: { name: true } },
        requestedBy: { select: { name: true } },
        assignedTo:  { select: { name: true } },
        expense:     { select: { id: true, status: true, amount: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * take,
      take,
    }),
    prisma.maintenanceRequest.count({ where }),
  ]);

  return { requests, total, page, pages: Math.ceil(total / take) };
}

/**
 * Check whether a facility has scheduled maintenance overlapping a proposed booking window.
 */
export async function getFacilityMaintenanceConflict(
  facilityId: string,
  startTime: Date,
  endTime: Date
) {
  return prisma.maintenanceRequest.findFirst({
    where: {
      facilityId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
      scheduledStart: { not: null },
      scheduledEnd:   { not: null },
      AND: [
        { scheduledStart: { lt: endTime } },
        { scheduledEnd:   { gt: startTime } },
      ],
    },
    select: {
      id: true,
      title: true,
      scheduledStart: true,
      scheduledEnd: true,
    },
  });
}
