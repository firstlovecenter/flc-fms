"use client";

import TaskListView from "./TaskListView";
import type { TaskWithRelations } from "./TaskBoardClient";

interface TaskMyViewProps {
  tasks: TaskWithRelations[];
  currentUserId: string;
  currentUserRole: string;
  onEdit: (task: TaskWithRelations) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: "TODO" | "IN_PROGRESS" | "DONE") => void;
}

export default function TaskMyView({
  tasks,
  currentUserId,
  currentUserRole,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskMyViewProps) {
  const myTasks = tasks.filter(
    (t) => t.assignedToId === currentUserId || t.createdById === currentUserId,
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--muted)]">
        Showing tasks assigned to or created by you — {myTasks.length} task{myTasks.length !== 1 ? "s" : ""}.
      </p>
      <TaskListView
        tasks={myTasks}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        emptyMessage="You have no tasks assigned to or created by you."
      />
    </div>
  );
}
