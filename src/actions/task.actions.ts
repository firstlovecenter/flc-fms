"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { sendPushToUser } from "@/lib/notifications/push";
import { sendSMS } from "@/lib/notifications/sms";

// ─── Notification helpers ─────────────────────────────────────────────────────

async function notifyAssigned(userId: string, taskTitle: string) {
  // Push notification (fire-and-forget)
  sendPushToUser(userId, {
    title: "New task assigned to you",
    body:  taskTitle,
    url:   "/tasks",
    tag:   "task-assigned",
  }).catch(() => {});

  // SMS if user has a phone number
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { phone: true, name: true },
  });
  if (user?.phone) {
    sendSMS({
      to:      user.phone,
      message: `Hi ${user.name ?? "there"}, a task has been assigned to you: "${taskTitle}". Log in to FLC FMS to view details.`,
    }).catch(() => {});
  }
}

async function notifyUnassigned(userId: string, taskTitle: string) {
  sendPushToUser(userId, {
    title: "Task unassigned",
    body:  `You have been removed from: "${taskTitle}"`,
    url:   "/tasks",
    tag:   "task-unassigned",
  }).catch(() => {});
}

// ─── Shared include shape ─────────────────────────────────────────────────────

const TASK_INCLUDE = {
  createdBy:  { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
} as const;

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  title:        z.string().min(2, "Title must be at least 2 characters").max(200),
  description:  z.string().max(1000).optional(),
  priority:     z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  dueDate:      z.coerce.date().optional(),
  assignedToId: z.string().cuid().optional(),
});

const UpdateSchema = z.object({
  title:        z.string().min(2).max(200).optional(),
  description:  z.string().max(1000).optional().nullable(),
  priority:     z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  dueDate:      z.coerce.date().optional().nullable(),
  assignedToId: z.string().cuid().optional().nullable(),
});

const MoveSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
});

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createTask(data: z.infer<typeof CreateSchema>) {
  const session   = await requireStaff();
  const validated = CreateSchema.parse(data);

  const task = await prisma.task.create({
    data: {
      title:        validated.title,
      description:  validated.description ?? null,
      priority:     validated.priority,
      dueDate:      validated.dueDate ?? null,
      assignedToId: validated.assignedToId ?? null,
      createdById:  session.sub,
    },
    include: TASK_INCLUDE,
  });

  auditLog({
    userId:   session.sub,
    action:   "CREATE_TASK",
    entity:   "Task",
    entityId: task.id,
    after:    { title: task.title, priority: task.priority, status: task.status },
  });

  // Notify assignee if different from creator
  if (validated.assignedToId && validated.assignedToId !== session.sub) {
    await notifyAssigned(validated.assignedToId, task.title);
  }

  revalidatePath("/tasks");
  return { success: true as const, task };
}

export async function updateTask(taskId: string, data: z.infer<typeof UpdateSchema>) {
  const session   = await requireStaff();
  const validated = UpdateSchema.parse(data);

  const existing = await prisma.task.findUniqueOrThrow({
    where:  { id: taskId },
    select: { createdById: true, assignedToId: true },
  });

  const canEdit =
    existing.createdById === session.sub ||
    session.role === "FACILITY_MANAGER"  ||
    session.role === "SUPER_ADMIN";

  if (!canEdit) {
    return { success: false as const, error: "You can only edit your own tasks." };
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data:  validated,
    include: TASK_INCLUDE,
  });

  auditLog({
    userId:   session.sub,
    action:   "UPDATE_TASK",
    entity:   "Task",
    entityId: taskId,
    after:    validated,
  });

  // Handle assignee change notifications
  const oldAssignee = existing.assignedToId;
  const newAssignee = validated.assignedToId ?? null;
  if (newAssignee !== oldAssignee) {
    // Notify old assignee they were removed (push only)
    if (oldAssignee && oldAssignee !== session.sub) {
      await notifyUnassigned(oldAssignee, task.title);
    }
    // Notify new assignee (push + SMS)
    if (newAssignee && newAssignee !== session.sub) {
      await notifyAssigned(newAssignee, task.title);
    }
  }

  revalidatePath("/tasks");
  return { success: true as const, task };
}

export async function moveTask(taskId: string, data: z.infer<typeof MoveSchema>) {
  const session   = await requireStaff();
  const validated = MoveSchema.parse(data);

  const task = await prisma.task.update({
    where: { id: taskId },
    data:  { status: validated.status },
    include: TASK_INCLUDE,
  });

  auditLog({
    userId:   session.sub,
    action:   "MOVE_TASK",
    entity:   "Task",
    entityId: taskId,
    after:    { status: validated.status },
  });

  revalidatePath("/tasks");
  return { success: true as const, task };
}

export async function deleteTask(taskId: string) {
  const session  = await requireStaff();

  const existing = await prisma.task.findUniqueOrThrow({
    where:  { id: taskId },
    select: { createdById: true },
  });

  const canDelete =
    existing.createdById === session.sub ||
    session.role === "FACILITY_MANAGER"  ||
    session.role === "SUPER_ADMIN";

  if (!canDelete) {
    return { success: false as const, error: "You can only delete your own tasks." };
  }

  await prisma.task.delete({ where: { id: taskId } });

  auditLog({
    userId:   session.sub,
    action:   "DELETE_TASK",
    entity:   "Task",
    entityId: taskId,
  });

  revalidatePath("/tasks");
  return { success: true as const };
}
