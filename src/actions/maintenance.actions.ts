"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { notifyMaintenanceUpdate, notifyFMMaintenanceRequested } from "@/lib/notifications/sms";

const CreateSchema = z.object({
  taskId:         z.string().optional(), // when converting a personal task
  facilityId:     z.string().optional(),
  title:          z.string().min(2).max(200),
  description:    z.string().min(5),
  priority:       z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  scheduledStart: z.coerce.date().optional(),
  scheduledEnd:   z.coerce.date().optional(),
  estimatedCost:  z.coerce.number().min(0).optional(),
}).refine(
  (d) => !d.scheduledStart || !d.scheduledEnd || d.scheduledEnd > d.scheduledStart,
  { message: "Scheduled end must be after scheduled start", path: ["scheduledEnd"] }
);

const UpdateSchema = z.object({
  status:       z.enum(["IN_PROGRESS", "RESOLVED", "CLOSED"]),
  assignedToId: z.string().min(1).optional(),
  actualCost:   z.coerce.number().min(0).optional(),
});

/** Shared helper — builds the expense title from facility name */
function expenseTitle(facilityName: string | null | undefined) {
  return `Maintenance — ${facilityName ?? "General"}`;
}


export async function createMaintenanceRequest(data: z.infer<typeof CreateSchema>) {
  const session = await requirePerm("maintenance:create");
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

  // ── Converted from a personal task: link it and mark it done ──────────────
  if (validated.taskId) {
    await prisma.task.updateMany({
      where: {
        id: validated.taskId,
        maintenanceRequestId: null,
        OR: [{ createdById: session.sub }, { assignedToId: session.sub }],
      },
      data: { maintenanceRequestId: request.id, completedAt: new Date() },
    });
    revalidatePath("/tasks");
  }

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
      select: { phone: true },
    }),
    validated.facilityId
      ? prisma.facility.findUnique({ where: { id: validated.facilityId }, select: { name: true } })
      : Promise.resolve(null),
    prisma.user.findUnique({ where: { id: session.sub }, select: { name: true } }),
  ]);

  // Notify FMs via SMS
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
  const session   = await requirePerm("maintenance:manage");
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

  // Unlock facility hard-lock when an emergency (unscheduled) maintenance request
  // is resolved or closed — but only if no other emergency maintenance is still open.
  // Scheduled maintenance requests do not set underMaintenance, so they must not
  // clear a lock that was set by an emergency request or a manual toggle.
  const isEmergencyRequest = !request.scheduledStart && !request.scheduledEnd;
  if (["RESOLVED", "CLOSED"].includes(validated.status) && request.facility && isEmergencyRequest) {
    const otherActiveEmergencies = await prisma.maintenanceRequest.count({
      where: {
        facilityId:     request.facility.id,
        id:             { not: requestId },
        status:         { in: ["OPEN", "IN_PROGRESS"] },
        scheduledStart: null,
      },
    });
    if (otherActiveEmergencies === 0) {
      await prisma.facility.update({
        where: { id: request.facility.id },
        data:  { underMaintenance: false },
      });
    }
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
  await requirePerm("maintenance:view");
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
