import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import TaskBoardClient from "@/components/tasks/TaskBoardClient";

export const metadata = { title: "Task Board" };

const TASK_INCLUDE = {
  createdBy:  { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
} as const;

export default async function TasksPage() {
  const session = await requireStaff();

  const [tasks, staffUsers] = await Promise.all([
    prisma.task.findMany({
      include:  TASK_INCLUDE,
      orderBy:  { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where:   { isActive: true, role: { not: "SUPER_ADMIN" } },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <TaskBoardClient
      initialTasks={tasks}
      staffUsers={staffUsers}
      currentUserId={session.sub}
      currentUserRole={session.role}
    />
  );
}
