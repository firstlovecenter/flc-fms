"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { sendPushToUser } from "@/lib/notifications/push";
import { sendSMS } from "@/lib/notifications/sms";
import { DUTY_LOG_INCLUDE } from "@/lib/duty/queries";
import {
  normalizeTemplateItemsForSave,
  type TemplateItemInput,
} from "@/lib/duty/template-form";
import type { SessionPayload } from "@/lib/auth/session";

function revalidateDutyPaths(dutyLogId?: string) {
  revalidatePath("/duty");
  revalidatePath("/duty/display");
  if (dutyLogId) revalidatePath(`/duty/${dutyLogId}`);
}

function canManage(session: SessionPayload) {
  return session.role === "FACILITY_MANAGER" || session.role === "SUPER_ADMIN";
}

async function syncDutyLogStatus(dutyLogId: string) {
  const log = await prisma.dutyLog.findUnique({
    where: { id: dutyLogId },
    include: { items: true },
  });
  if (!log || log.status === "SIGNED_OFF") return;

  const allDone = log.items.length > 0 && log.items.every((i) => i.isDone);
  if (allDone && log.status === "ACTIVE") {
    await prisma.dutyLog.update({
      where: { id: dutyLogId },
      data: { status: "COMPLETED" },
    });
  } else if (!allDone && log.status === "COMPLETED") {
    await prisma.dutyLog.update({
      where: { id: dutyLogId },
      data: { status: "ACTIVE" },
    });
  }
}

async function notifyAssigned(userId: string, templateName: string, date: Date) {
  const dateStr = date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  sendPushToUser(userId, {
    title: "Duty assigned",
    body: `${templateName} — ${dateStr}`,
    url: "/duty",
    tag: "duty-assigned",
  }).catch(() => {});

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, name: true },
  });
  if (user?.phone) {
    sendSMS({
      to: user.phone,
      message: `Hi ${user.name ?? "there"}, you have been assigned "${templateName}" for ${dateStr}. Log in to FLC FMS to complete your duty log.`,
    }).catch(() => {});
  }
}

const AssignSchema = z.object({
  templateId: z.string().min(1, "Select a duty form"),
  date: z.coerce.date(),
  assignedToId: z.string().cuid(),
});

export async function assignDuty(data: z.infer<typeof AssignSchema>) {
  const session = await requireStaff("FACILITY_MANAGER", "SUPER_ADMIN");
  if (!canManage(session)) {
    return { success: false as const, error: "Only facility managers can assign duties." };
  }

  const validated = AssignSchema.parse(data);
  const dateOnly = startOfDay(validated.date);

  const template = await prisma.dutyTemplate.findUnique({
    where: { id: validated.templateId, isActive: true },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) {
    return { success: false as const, error: "Duty template not found." };
  }

  const existing = await prisma.dutyLog.findUnique({
    where: {
      templateId_date_assignedToId: {
        templateId: validated.templateId,
        date: dateOnly,
        assignedToId: validated.assignedToId,
      },
    },
  });
  if (existing) {
    return {
      success: false as const,
      error: "This staff member already has this duty assigned for that date.",
    };
  }

  const dutyLog = await prisma.dutyLog.create({
    data: {
      templateId: validated.templateId,
      date: dateOnly,
      assignedToId: validated.assignedToId,
      createdById: session.sub,
      items: {
        create: template.items.map((item) => ({
          sortOrder: item.sortOrder,
          timeType: item.timeType,
          scheduledTime: item.scheduledTime,
          description: item.description,
        })),
      },
    },
    include: DUTY_LOG_INCLUDE,
  });

  auditLog({
    userId: session.sub,
    action: "ASSIGN_DUTY",
    entity: "DutyLog",
    entityId: dutyLog.id,
    after: {
      template: template.name,
      date: dateOnly.toISOString(),
      assignedToId: validated.assignedToId,
    },
  });

  if (validated.assignedToId !== session.sub) {
    await notifyAssigned(validated.assignedToId, template.name, dateOnly);
  }

  revalidateDutyPaths(dutyLog.id);
  return { success: true as const, dutyLog };
}

export async function completeDutyItem(dutyLogId: string, itemId: string, isDone: boolean) {
  const session = await requireStaff();

  const log = await prisma.dutyLog.findUnique({
    where: { id: dutyLogId },
    select: { assignedToId: true, status: true },
  });
  if (!log) return { success: false as const, error: "Duty log not found." };
  if (log.status === "SIGNED_OFF") {
    return { success: false as const, error: "This duty log is signed off and cannot be edited." };
  }

  const canComplete =
    log.assignedToId === session.sub || canManage(session);
  if (!canComplete) {
    return { success: false as const, error: "You can only complete items on your own duty log." };
  }

  await prisma.dutyLogItem.update({
    where: { id: itemId, dutyLogId },
    data: {
      isDone,
      completedAt: isDone ? new Date() : null,
      signedById: isDone ? session.sub : null,
    },
  });

  await syncDutyLogStatus(dutyLogId);

  auditLog({
    userId: session.sub,
    action: isDone ? "COMPLETE_DUTY_ITEM" : "UNCOMPLETE_DUTY_ITEM",
    entity: "DutyLogItem",
    entityId: itemId,
    after: { dutyLogId, isDone },
  });

  revalidateDutyPaths(dutyLogId);
  return { success: true as const };
}

export async function signDutyAsAssignee(dutyLogId: string) {
  const session = await requireStaff();

  const log = await prisma.dutyLog.findUnique({
    where: { id: dutyLogId },
    select: { assignedToId: true, status: true },
  });
  if (!log) return { success: false as const, error: "Duty log not found." };
  if (log.assignedToId !== session.sub && !canManage(session)) {
    return { success: false as const, error: "Only the assigned person can sign this log." };
  }

  await prisma.dutyLog.update({
    where: { id: dutyLogId },
    data: { assigneeSignedAt: new Date() },
  });

  auditLog({
    userId: session.sub,
    action: "SIGN_DUTY_ASSIGNEE",
    entity: "DutyLog",
    entityId: dutyLogId,
  });

  revalidateDutyPaths(dutyLogId);
  return { success: true as const };
}

export async function signDutyAsSupervisor(dutyLogId: string) {
  const session = await requireStaff("FACILITY_MANAGER", "SUPER_ADMIN");
  if (!canManage(session)) {
    return { success: false as const, error: "Only supervisors can sign off duty logs." };
  }

  const log = await prisma.dutyLog.findUnique({
    where: { id: dutyLogId },
    include: { items: true },
  });
  if (!log) return { success: false as const, error: "Duty log not found." };

  const incomplete = log.items.filter((i) => !i.isDone);
  if (incomplete.length > 0) {
    return {
      success: false as const,
      error: `${incomplete.length} task(s) still incomplete.`,
    };
  }

  await prisma.dutyLog.update({
    where: { id: dutyLogId },
    data: {
      supervisorId: session.sub,
      supervisorSignedAt: new Date(),
      status: "SIGNED_OFF",
    },
  });

  auditLog({
    userId: session.sub,
    action: "SIGN_DUTY_SUPERVISOR",
    entity: "DutyLog",
    entityId: dutyLogId,
  });

  revalidateDutyPaths(dutyLogId);
  return { success: true as const };
}

export async function deleteDutyLog(dutyLogId: string) {
  const session = await requireStaff("FACILITY_MANAGER", "SUPER_ADMIN");
  if (!canManage(session)) {
    return { success: false as const, error: "Only facility managers can delete duty logs." };
  }

  await prisma.dutyLog.delete({ where: { id: dutyLogId } });

  auditLog({
    userId: session.sub,
    action: "DELETE_DUTY_LOG",
    entity: "DutyLog",
    entityId: dutyLogId,
  });

  revalidateDutyPaths();
  return { success: true as const };
}

// ─── Duty templates (FM / Super Admin) ───────────────────────────────────────

const TemplateItemSchema = z.object({
  description: z.string().min(1, "Task description is required").max(500),
  timeType: z.enum(["SPECIFIC", "END_OF_DAY", "CONTINUOUS"]),
  scheduledTime: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format").nullable().optional(),
  ),
});

const CreateTemplateSchema = z
  .object({
    name: z.string().min(2, "Name is required").max(120),
    type: z.enum(["TIMED_LOG", "END_OF_SHIFT", "CHECKLIST"]),
    items: z.array(TemplateItemSchema).min(1, "Add at least one task"),
  })
  .superRefine((data, ctx) => {
    if (data.type === "CHECKLIST") return;
    data.items.forEach((item, index) => {
      if (item.timeType === "SPECIFIC" && !item.scheduledTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a time (HH:MM) for this task",
          path: ["items", index, "scheduledTime"],
        });
      }
    });
  });

type TemplateFormPayload = {
  name: string;
  type: z.infer<typeof CreateTemplateSchema>["type"];
  items: TemplateItemInput[];
};

function parseTemplatePayload(data: TemplateFormPayload) {
  const normalized = {
    name: data.name.trim(),
    type: data.type,
    items: normalizeTemplateItemsForSave(data.type, data.items),
  };
  return CreateTemplateSchema.safeParse(normalized);
}

export async function createDutyTemplate(data: TemplateFormPayload) {
  const session = await requireStaff("FACILITY_MANAGER", "SUPER_ADMIN");
  if (!canManage(session)) {
    return { success: false as const, error: "Only facility managers can create duty forms." };
  }

  const parsed = parseTemplatePayload(data);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.errors[0]?.message ?? "Invalid form data",
    };
  }
  const validated = parsed.data;

  try {
    const maxSort = await prisma.dutyTemplate.aggregate({ _max: { sortOrder: true } });
    const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

    const template = await prisma.dutyTemplate.create({
      data: {
        name: validated.name,
        type: validated.type,
        sortOrder,
        items: {
          create: validated.items.map((item, index) => ({
            sortOrder: index + 1,
            description: item.description,
            timeType: item.timeType,
            scheduledTime:
              item.timeType === "SPECIFIC" ? item.scheduledTime ?? null : null,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    auditLog({
      userId: session.sub,
      action: "CREATE_DUTY_TEMPLATE",
      entity: "DutyTemplate",
      entityId: template.id,
      after: { name: template.name, type: template.type, itemCount: template.items.length },
    });

    revalidatePath("/duty");
    revalidatePath("/duty/templates");
    return { success: true as const, template };
  } catch (err) {
    console.error("createDutyTemplate failed:", err);
    return {
      success: false as const,
      error: "Could not save duty form. Please try again.",
    };
  }
}

export async function updateDutyTemplate(templateId: string, data: TemplateFormPayload) {
  const session = await requireStaff("FACILITY_MANAGER", "SUPER_ADMIN");
  if (!canManage(session)) {
    return { success: false as const, error: "Only facility managers can edit duty forms." };
  }

  const existing = await prisma.dutyTemplate.findUnique({
    where: { id: templateId },
    include: { _count: { select: { dutyLogs: true } } },
  });
  if (!existing) {
    return { success: false as const, error: "Duty form not found." };
  }

  if (existing._count.dutyLogs > 0 && data.type !== existing.type) {
    return {
      success: false as const,
      error: "Cannot change form type while assignments exist.",
    };
  }

  const parsed = parseTemplatePayload(data);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.errors[0]?.message ?? "Invalid form data",
    };
  }
  const validated = parsed.data;

  try {
    const template = await prisma.$transaction(async (tx) => {
      await tx.dutyTemplateItem.deleteMany({ where: { templateId } });
      return tx.dutyTemplate.update({
        where: { id: templateId },
        data: {
          name: validated.name,
          type: validated.type,
          items: {
            create: validated.items.map((item, index) => ({
              sortOrder: index + 1,
              description: item.description,
              timeType: item.timeType,
              scheduledTime:
                item.timeType === "SPECIFIC" ? item.scheduledTime ?? null : null,
            })),
          },
        },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });
    });

    auditLog({
      userId: session.sub,
      action: "UPDATE_DUTY_TEMPLATE",
      entity: "DutyTemplate",
      entityId: templateId,
      after: { name: template.name, type: template.type, itemCount: template.items.length },
    });

    revalidatePath("/duty");
    revalidatePath("/duty/templates");
    revalidatePath(`/duty/templates/${templateId}/edit`);
    return { success: true as const, template };
  } catch (err) {
    console.error("updateDutyTemplate failed:", err);
    return {
      success: false as const,
      error: "Could not save duty form. Please try again.",
    };
  }
}

export async function setDutyTemplateActive(templateId: string, isActive: boolean) {
  const session = await requireStaff("FACILITY_MANAGER", "SUPER_ADMIN");
  if (!canManage(session)) {
    return { success: false as const, error: "Only facility managers can update duty forms." };
  }

  await prisma.dutyTemplate.update({
    where: { id: templateId },
    data: { isActive },
  });

  auditLog({
    userId: session.sub,
    action: isActive ? "ACTIVATE_DUTY_TEMPLATE" : "DEACTIVATE_DUTY_TEMPLATE",
    entity: "DutyTemplate",
    entityId: templateId,
  });

  revalidatePath("/duty");
  revalidatePath("/duty/templates");
  return { success: true as const };
}

export async function deleteDutyTemplate(templateId: string) {
  const session = await requireStaff("FACILITY_MANAGER", "SUPER_ADMIN");
  if (!canManage(session)) {
    return { success: false as const, error: "Only facility managers can delete duty forms." };
  }

  const existing = await prisma.dutyTemplate.findUnique({
    where: { id: templateId },
    include: { _count: { select: { dutyLogs: true } } },
  });
  if (!existing) {
    return { success: false as const, error: "Duty form not found." };
  }
  if (existing._count.dutyLogs > 0) {
    return {
      success: false as const,
      error: "Cannot delete a form that has assignments. Deactivate it instead.",
    };
  }

  await prisma.dutyTemplate.delete({ where: { id: templateId } });

  auditLog({
    userId: session.sub,
    action: "DELETE_DUTY_TEMPLATE",
    entity: "DutyTemplate",
    entityId: templateId,
  });

  revalidatePath("/duty");
  revalidatePath("/duty/templates");
  return { success: true as const };
}

const UpdateAssignmentSchema = z.object({
  assignedToId: z.string().cuid(),
  date: z.coerce.date(),
});

export async function updateDutyAssignment(
  dutyLogId: string,
  data: z.infer<typeof UpdateAssignmentSchema>,
) {
  const session = await requireStaff("FACILITY_MANAGER", "SUPER_ADMIN");
  if (!canManage(session)) {
    return { success: false as const, error: "Only facility managers can edit assignments." };
  }

  const validated = UpdateAssignmentSchema.parse(data);
  const dateOnly = startOfDay(validated.date);

  const existing = await prisma.dutyLog.findUnique({
    where: { id: dutyLogId },
    select: { templateId: true, status: true, assignedToId: true },
  });
  if (!existing) {
    return { success: false as const, error: "Duty log not found." };
  }
  if (existing.status === "SIGNED_OFF") {
    return { success: false as const, error: "Signed-off duty logs cannot be edited." };
  }

  const conflict = await prisma.dutyLog.findUnique({
    where: {
      templateId_date_assignedToId: {
        templateId: existing.templateId,
        date: dateOnly,
        assignedToId: validated.assignedToId,
      },
    },
  });
  if (conflict && conflict.id !== dutyLogId) {
    return {
      success: false as const,
      error: "This staff member already has this duty for that date.",
    };
  }

  const dutyLog = await prisma.dutyLog.update({
    where: { id: dutyLogId },
    data: {
      assignedToId: validated.assignedToId,
      date: dateOnly,
    },
    include: DUTY_LOG_INCLUDE,
  });

  if (validated.assignedToId !== existing.assignedToId) {
    const template = await prisma.dutyTemplate.findUnique({
      where: { id: existing.templateId },
      select: { name: true },
    });
    if (template) {
      await notifyAssigned(validated.assignedToId, template.name, dateOnly);
    }
  }

  auditLog({
    userId: session.sub,
    action: "UPDATE_DUTY_ASSIGNMENT",
    entity: "DutyLog",
    entityId: dutyLogId,
    after: { assignedToId: validated.assignedToId, date: dateOnly.toISOString() },
  });

  revalidateDutyPaths(dutyLogId);
  return { success: true as const, dutyLog };
}
