"use client";

import { Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";
import type { TaskWithRelations } from "./TaskBoardClient";

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMN_ACCENT: Record<string, string> = {
  TODO:        "rgba(245,158,11,0.5)",
  IN_PROGRESS: "rgba(59,130,246,0.5)",
  DONE:        "rgba(34,197,94,0.5)",
};

const COLUMN_HEADER_COLOR: Record<string, string> = {
  TODO:        "text-amber-300",
  IN_PROGRESS: "text-blue-300",
  DONE:        "text-emerald-300",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskColumnProps {
  columnId: "TODO" | "IN_PROGRESS" | "DONE";
  label: string;
  tasks: TaskWithRelations[];
  currentUserId: string;
  currentUserRole: string;
  onEdit: (task: TaskWithRelations) => void;
  onDelete: (taskId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TaskColumn({
  columnId,
  label,
  tasks,
  currentUserId,
  currentUserRole,
  onEdit,
  onDelete,
}: TaskColumnProps) {
  return (
    <div className="flex flex-col min-w-0 flex-1">
      {/* Column header */}
      <div
        className="rounded-t-xl px-4 py-3 border-t-2 flex items-center justify-between"
        style={{
          borderTopColor: COLUMN_ACCENT[columnId],
          background: "rgba(255,255,255,0.06)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h3 className={`text-sm font-semibold uppercase tracking-wide ${COLUMN_HEADER_COLOR[columnId]}`}>
          {label}
        </h3>
        <span className="text-xs font-medium text-[var(--muted)] bg-[rgba(255,255,255,0.08)] px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={[
              "flex-1 min-h-[200px] rounded-b-xl p-3 space-y-3 transition-colors duration-150",
              "border border-t-0",
              snapshot.isDraggingOver
                ? "bg-[rgba(255,255,255,0.06)] border-[rgba(200,163,90,0.3)]"
                : "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)]",
            ].join(" ")}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="h-full min-h-[120px] flex items-center justify-center rounded-lg border border-dashed border-[rgba(255,255,255,0.1)]">
                <p className="text-xs text-[var(--muted)] opacity-60">No tasks</p>
              </div>
            )}

            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
