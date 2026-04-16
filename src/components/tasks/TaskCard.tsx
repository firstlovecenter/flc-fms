"use client";

import { Draggable } from "@hello-pangea/dnd";
import { format, isPast } from "date-fns";
import { CalendarDays, User, Pencil, Trash2 } from "lucide-react";
import type { TaskWithRelations } from "./TaskBoardClient";

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-500/20 text-red-300 border border-red-500/30",
  HIGH:     "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  MEDIUM:   "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  LOW:      "bg-green-500/20 text-green-300 border border-green-500/30",
};

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: "Critical",
  HIGH:     "High",
  MEDIUM:   "Medium",
  LOW:      "Low",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: TaskWithRelations;
  index: number;
  currentUserId: string;
  currentUserRole: string;
  onEdit: (task: TaskWithRelations) => void;
  onDelete: (taskId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TaskCard({
  task,
  index,
  currentUserId,
  currentUserRole,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const canManage =
    task.createdById === currentUserId ||
    currentUserRole === "FACILITY_MANAGER" ||
    currentUserRole === "SUPER_ADMIN";

  const isOverdue =
    task.dueDate != null &&
    isPast(new Date(task.dueDate)) &&
    task.status !== "DONE";

  function handleDelete() {
    if (window.confirm(`Delete "${task.title}"? This cannot be undone.`)) {
      onDelete(task.id);
    }
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
          className={[
            "rounded-xl p-4 space-y-3 transition-all duration-150 cursor-grab active:cursor-grabbing",
            "border",
            snapshot.isDragging
              ? "border-[rgba(200,163,90,0.6)] bg-[rgba(255,255,255,0.18)] shadow-2xl rotate-1"
              : "border-[rgba(200,163,90,0.2)] bg-[rgba(255,255,255,0.08)] hover:-translate-y-0.5 hover:border-[rgba(200,163,90,0.4)] hover:shadow-lg",
          ].join(" ")}
        >
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-[var(--cream)] leading-snug flex-1">
              {task.title}
            </p>
            <span
              className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority] ?? ""}`}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
            {task.assignedTo && (
              <span className="flex items-center gap-1">
                <User size={11} />
                {task.assignedTo.name}
              </span>
            )}
            {task.dueDate && (
              <span
                className={`flex items-center gap-1 ${isOverdue ? "text-rose-400 font-medium" : ""}`}
              >
                <CalendarDays size={11} />
                {format(new Date(task.dueDate), "MMM d, yyyy")}
                {isOverdue && " · overdue"}
              </span>
            )}
          </div>

          {/* Actions */}
          {canManage && (
            <div className="flex items-center gap-2 pt-1 border-t border-[rgba(255,255,255,0.06)]">
              <button
                type="button"
                onClick={() => onEdit(task)}
                className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--cream)] transition-colors"
              >
                <Pencil size={11} />
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-rose-400 transition-colors"
              >
                <Trash2 size={11} />
                Delete
              </button>
              <span className="ml-auto text-[10px] text-[var(--muted)] opacity-50">
                by {task.createdBy.name}
              </span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
