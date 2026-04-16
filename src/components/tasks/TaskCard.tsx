"use client";

import { Draggable } from "@hello-pangea/dnd";
import { format, isPast } from "date-fns";
import { CalendarDays, User, Pencil, Trash2, AlertCircle } from "lucide-react";
import type { TaskWithRelations } from "./TaskBoardClient";

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  CRITICAL: { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5", label: "Critical" },
  HIGH:     { bg: "#ffedd5", text: "#c2410c", border: "#fdba74", label: "High"     },
  MEDIUM:   { bg: "#fef9c3", text: "#a16207", border: "#fde047", label: "Medium"   },
  LOW:      { bg: "#dcfce7", text: "#15803d", border: "#86efac", label: "Low"      },
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

  const pCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.MEDIUM;

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
          style={{
            ...provided.draggableProps.style,
            boxShadow: snapshot.isDragging
              ? "0 12px 32px rgba(10,22,40,0.16), 0 2px 8px rgba(10,22,40,0.10)"
              : "0 1px 3px rgba(10,22,40,0.06)",
          }}
          className={[
            "rounded-xl p-4 space-y-3 bg-white transition-shadow duration-150 cursor-grab active:cursor-grabbing border",
            snapshot.isDragging
              ? "border-[var(--gold)] rotate-1 scale-[1.02]"
              : "border-[var(--border)] hover:border-[rgba(200,163,90,0.5)] hover:shadow-md",
          ].join(" ")}
        >
          {/* Title + priority */}
          <div className="flex items-start gap-2">
            <p className="text-sm font-semibold text-[var(--navy)] leading-snug flex-1">
              {task.title}
            </p>
            <span
              className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border whitespace-nowrap"
              style={{ background: pCfg.bg, color: pCfg.text, borderColor: pCfg.border }}
            >
              {pCfg.label}
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
              <span className={`flex items-center gap-1 ${
                isOverdue ? "text-rose-600 font-semibold" : ""
              }`}>
                {isOverdue ? <AlertCircle size={11} /> : <CalendarDays size={11} />}
                {format(new Date(task.dueDate), "MMM d, yyyy")}
                {isOverdue && (
                  <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full border border-rose-200">
                    Overdue
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Actions */}
          {canManage && (
            <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => onEdit(task)}
                className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--navy)] transition-colors"
              >
                <Pencil size={11} />
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-rose-600 transition-colors"
              >
                <Trash2 size={11} />
                Delete
              </button>
              <span className="ml-auto text-[10px] text-[var(--muted)] truncate max-w-[100px]">
                {task.createdBy.name}
              </span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
