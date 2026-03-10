"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff, requirePermission } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { notifyMaintenanceUpdate } from "@/lib/notifications/sms";
import { sendMaintenanceOpenedEmail } from "@/lib/notifications/email";

const CreateSchema = z.object({
  facilityId:    z.string().optional(),
  title:         z.string().min(2).max(200),
  description:   z.string().min(5),
  priority:      z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  // If provided → scheduled maintenance: facility only blocked within this window
  scheduledStart: z.coerce.date().optional(),
  scheduledEnd:   z.coerce.date().optional(),
  estimatedCost: z.coerce.number().positive().optional(),
}).refine(
  (d) => !d.scheduledStart || !d.scheduledEnd || d.scheduledEnd > d.scheduledStart,
  { message: "Scheduled end must be after scheduled start", path: ["scheduledEnd"] }
);

const UpdateSchema = z.object({
  status:        z.enum(["IN_PROGRESS", "RESOLVED", "CLOSED"]),
  assignedToId:  z.string().min(1).optional(),
  actualCost:    z.coerce.number().positive().optional(),
});

export async function createMaintenanceRequest(data: z.infer<typeof CreateSchema>) {
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

  // Only hard-lock the facility for emergency (un-scheduled) maintenance on a facility
  if (validated.facilityId && isEmergency) {
    await prisma.facility.update({
      where: { id: validated.facilityId },
      data:  { underMaintenance: true },
    });
  }

  // Notify FMs by email (only when tied to a facility)
  if (validated.facilityId) {
    const [fms, facility, reporter] = await Promise.all([
      prisma.user.findMany({
        where:  { role: "FACILITY_MANAGER", isActive: true },
        select: { email: true, name: true },
      }),
      prisma.facility.findUnique({
        where:  { id: validated.facilityId },
        select: { name: true },
      }),
      prisma.user.findUnique({
        where:  { id: session.sub },
        select: { name: true },
      }),
    ]);
    for (const fm of fms) {
      await sendMaintenanceOpenedEmail({
        to:           fm.email,
        fmName:       fm.name,
        facilityName: facility?.name ?? "Unknown",
        requestTitle: validated.title,
        priority:     validated.priority ?? "MEDIUM",
        reportedBy:   reporter?.name ?? "Staff",
      });
    }
  }

  auditLog({ userId: session.sub, action: "CREATE_MAINTENANCE", entity: "MaintenanceRequest", entityId: request.id });
  revalidatePath("/maintenance");
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
      ...validated,
      resolvedAt: validated.status === "RESOLVED" ? new Date() : undefined,
      closedAt:   validated.status === "CLOSED"   ? new Date() : undefined,
    },
    include: {
      facility:   { select: { id: true, name: true } },
      assignedTo: { select: { phone: true } },
    },
  });

  // Unlock facility emergency-lock when resolved/closed
  if (["RESOLVED", "CLOSED"].includes(validated.status) && request.facility) {
    // Only clear the hard-lock; scheduled maintenance is handled via date-range checks
    await prisma.facility.update({
      where: { id: request.facility.id },
      data:  { underMaintenance: false },
    });
  }

  if (request.assignedTo?.phone && request.facility) {
    await notifyMaintenanceUpdate({
      phone:        request.assignedTo.phone,
      requestId:    request.id,
      facilityName: request.facility.name,
      status:       validated.status,
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
  return { success: true, request };
}

export async function getMaintenanceRequests(filters: {
  status?: string;
  priority?: string;
  facilityId?: string;
  page?: number;
} = {}) {
  await requireStaff();
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
 * Returns the conflicting maintenance request (with its window) or null.
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

