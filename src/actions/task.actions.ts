"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { sendPushToUser } from "@/lib/notifications/push";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

const CreateSchema = z.object({
  title:        z.string().trim().min(1, "Task title is required").max(300),
  priority:     z.enum(PRIORITIES).optional(),
  dueDate:      z.coerce.date().optional(),
  assignedToId: z.string().min(1).optional(),
});

const UpdateSchema = z.object({
  title:        z.string().trim().min(1).max(300).optional(),
  priority:     z.enum(PRIORITIES).nullable().optional(),
  dueDate:      z.coerce.date().nullable().optional(),
  assignedToId: z.string().min(1).nullable().optional(),
});

/** A task can be managed by its creator, its assignee, or a super admin. */
async function requireTaskAccess(taskId: string) {
  const session = await requireStaff();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  const canAccess =
    session.role === "SUPER_ADMIN" ||
    task.createdById === session.sub ||
    task.assignedToId === session.sub;
  if (!canAccess) throw new Error("You don't have access to this task");

  return { session, task };
}

/** Notify a staff member that a task was assigned to them. */
async function notifyAssignee(assignedToId: string, creatorId: string, title: string) {
  if (assignedToId === creatorId) return; // self-assignment — no notification
  const creator = await prisma.user.findUnique({
    where: { id: creatorId },
    select: { name: true },
  });
  await sendPushToUser(assignedToId, {
    title: "New task assigned to you",
    body: `${creator?.name ?? "A colleague"}: ${title}`,
    url: "/tasks",
    tag: "task-assigned",
  });
}

export async function createTask(data: z.infer<typeof CreateSchema>) {
  const session = await requireStaff();
  const validated = CreateSchema.parse(data);

  const task = await prisma.task.create({
    data: {
      title:        validated.title,
      priority:     validated.priority ?? null,
      dueDate:      validated.dueDate ?? null,
      assignedToId: validated.assignedToId ?? null,
      createdById:  session.sub,
    },
  });

  if (validated.assignedToId) {
    await notifyAssignee(validated.assignedToId, session.sub, validated.title);
  }

  auditLog({ userId: session.sub, action: "CREATE_TASK", entity: "Task", entityId: task.id });
  revalidatePath("/tasks");
  return { success: true, task };
}

export async function toggleTaskComplete(taskId: string) {
  const { session, task } = await requireTaskAccess(taskId);

  const updated = await prisma.task.update({
    where: { id: taskId },
    data:  { completedAt: task.completedAt ? null : new Date() },
  });

  auditLog({
    userId: session.sub,
    action: updated.completedAt ? "COMPLETE_TASK" : "REOPEN_TASK",
    entity: "Task",
    entityId: taskId,
  });
  revalidatePath("/tasks");
  return { success: true, completed: !!updated.completedAt };
}

export async function updateTask(taskId: string, data: z.infer<typeof UpdateSchema>) {
  const { session, task } = await requireTaskAccess(taskId);
  const validated = UpdateSchema.parse(data);

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(validated.title !== undefined        ? { title: validated.title } : {}),
      ...(validated.priority !== undefined     ? { priority: validated.priority } : {}),
      ...(validated.dueDate !== undefined      ? { dueDate: validated.dueDate } : {}),
      ...(validated.assignedToId !== undefined ? { assignedToId: validated.assignedToId } : {}),
    },
  });

  // Notify only when the assignee actually changed
  if (
    validated.assignedToId &&
    validated.assignedToId !== task.assignedToId
  ) {
    await notifyAssignee(validated.assignedToId, session.sub, updated.title);
  }

  auditLog({ userId: session.sub, action: "UPDATE_TASK", entity: "Task", entityId: taskId, after: validated });
  revalidatePath("/tasks");
  return { success: true, task: updated };
}

export async function deleteTask(taskId: string) {
  const { session } = await requireTaskAccess(taskId);

  await prisma.task.delete({ where: { id: taskId } });

  auditLog({ userId: session.sub, action: "DELETE_TASK", entity: "Task", entityId: taskId });
  revalidatePath("/tasks");
  return { success: true };
}
