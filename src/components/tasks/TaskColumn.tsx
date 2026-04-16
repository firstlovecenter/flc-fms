"use client";

import { Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";
import type { TaskWithRelations } from "./TaskBoardClient";

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMN_CONFIG: Record<string, { accent: string; bg: string; labelColor: string; dot: string }> = {
  TODO:        { accent: "#f59e0b", bg: "rgba(245,158,11,0.06)",  labelColor: "#b45309", dot: "bg-amber-400" },
  IN_PROGRESS: { accent: "#3b82f6", bg: "rgba(59,130,246,0.06)",  labelColor: "#1d4ed8", dot: "bg-blue-400" },
  DONE:        { accent: "#16a34a", bg: "rgba(22,163,74,0.06)",   labelColor: "#15803d", dot: "bg-emerald-400" },
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
  const cfg = COLUMN_CONFIG[columnId];

  return (
    <div className="flex flex-col min-w-0 flex-1">
      {/* Column header */}
      <div
        className="rounded-t-xl px-4 py-3 flex items-center justify-between border border-b-0"
        style={{
          borderColor: "var(--border)",
          borderTop: `3px solid ${cfg.accent}`,
          background: cfg.bg,
        }}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
          <h3 className="text-sm font-bold tracking-wide" style={{ color: cfg.labelColor }}>{label}</h3>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: cfg.accent + "22", color: cfg.accent }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 min-h-[220px] rounded-b-xl p-3 space-y-3 transition-colors duration-150 border border-t-0"
            style={{
              borderColor: snapshot.isDraggingOver ? cfg.accent + "55" : "var(--border)",
              background: snapshot.isDraggingOver ? cfg.bg : "var(--cream)",
            }}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="h-full min-h-[140px] flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)]">
                <p className="text-xs text-[var(--muted)]">Drop tasks here</p>
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
