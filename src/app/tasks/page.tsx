import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import TaskInbox from "@/components/tasks/TaskInbox";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await requireStaff();
  const userId = session.sub;

  // A staff member only ever sees tasks they created or that are assigned to
  // them. Guard against a missing id: with `userId` undefined, Prisma would
  // drop the `OR` conditions entirely and return EVERY task — leaking other
  // staff's tasks (including ones the FM assigned to someone else). Fail
  // closed by matching nothing instead.
  const visibleTo: Prisma.TaskWhereInput = userId
    ? { OR: [{ createdById: userId }, { assignedToId: userId }] }
    : { id: { in: [] } };

  const [openTasks, completedTasks, staff] = await Promise.all([
    prisma.task.findMany({
      where: { ...visibleTo, completedAt: null },
      include: {
        createdBy:  { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        maintenanceRequest: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.task.findMany({
      where: { ...visibleTo, completedAt: { not: null } },
      include: {
        createdBy:  { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        maintenanceRequest: { select: { id: true, status: true } },
      },
      orderBy: { completedAt: "desc" },
      take: 50,
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialize = (t: (typeof openTasks)[number]) => ({
    id:          t.id,
    title:       t.title,
    priority:    t.priority,
    dueDate:     t.dueDate?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdById: t.createdById,
    createdBy:   t.createdBy.name,
    assignedToId: t.assignedToId,
    assignedTo:  t.assignedTo?.name ?? null,
    maintenanceRequestId: t.maintenanceRequest?.id ?? null,
  });

  return (
    <TaskInbox
      openTasks={openTasks.map(serialize)}
      completedTasks={completedTasks.map(serialize)}
      staff={staff}
      currentUserId={userId}
    />
  );
}
