import { requirePerm } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import TaskInbox from "@/components/tasks/TaskInbox";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await requirePerm("tasks:view");

  const visibleTo = {
    OR: [{ createdById: session.sub }, { assignedToId: session.sub }],
  };

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
      where: { isActive: true, role: { not: "PATRON" } },
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
      currentUserId={session.sub}
    />
  );
}
