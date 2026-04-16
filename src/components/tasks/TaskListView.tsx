"use client";

import { format, isPast } from "date-fns";
import { Pencil, Trash2, AlertCircle } from "lucide-react";
import { moveTask } from "@/actions/task.actions";
import { toast } from "sonner";
import type { TaskWithRelations } from "./TaskBoardClient";

// ─── Priority config (shared with TaskCard) ───────────────────────────────────

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  CRITICAL: { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5", label: "Critical" },
  HIGH:     { bg: "#ffedd5", text: "#c2410c", border: "#fdba74", label: "High"     },
  MEDIUM:   { bg: "#fef9c3", text: "#a16207", border: "#fde047", label: "Medium"   },
  LOW:      { bg: "#dcfce7", text: "#15803d", border: "#86efac", label: "Low"      },
};

const STATUS_LABELS: Record<string, string> = {
  TODO:        "To Do",
  IN_PROGRESS: "In Progress",
  DONE:        "Done",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskListViewProps {
  tasks: TaskWithRelations[];
  currentUserId: string;
  currentUserRole: string;
  onEdit: (task: TaskWithRelations) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: "TODO" | "IN_PROGRESS" | "DONE") => void;
  emptyMessage?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TaskListView({
  tasks,
  currentUserId,
  currentUserRole,
  onEdit,
  onDelete,
  onStatusChange,
  emptyMessage = "No tasks found.",
}: TaskListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <p className="text-[var(--muted)] text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm min-w-[680px]">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide w-[35%]">Title</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Priority</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Assigned To</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Due Date</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {tasks.map((task) => {
            const pCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.MEDIUM;
            const isOverdue =
              task.dueDate != null &&
              isPast(new Date(task.dueDate)) &&
              task.status !== "DONE";
            const canManage =
              task.createdById === currentUserId ||
              currentUserRole === "FACILITY_MANAGER" ||
              currentUserRole === "SUPER_ADMIN";

            return (
              <tr
                key={task.id}
                className={isOverdue ? "bg-rose-50" : "hover:bg-[var(--cream)] transition-colors"}
              >
                {/* Title */}
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--navy)] leading-snug">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-1">{task.description}</p>
                  )}
                </td>

                {/* Priority */}
                <td className="px-4 py-3">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border whitespace-nowrap"
                    style={{ background: pCfg.bg, color: pCfg.text, borderColor: pCfg.border }}
                  >
                    {pCfg.label}
                  </span>
                </td>

                {/* Status — inline select */}
                <td className="px-4 py-3">
                  <select
                    value={task.status}
                    onChange={(e) =>
                      onStatusChange(task.id, e.target.value as "TODO" | "IN_PROGRESS" | "DONE")
                    }
                    className="text-xs border border-[var(--border)] rounded-md px-2 py-1 bg-white text-[var(--navy)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)]"
                  >
                    {(["TODO", "IN_PROGRESS", "DONE"] as const).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </td>

                {/* Assigned to */}
                <td className="px-4 py-3 text-[var(--muted)] text-xs">
                  {task.assignedTo?.name ?? <span className="italic">Unassigned</span>}
                </td>

                {/* Due date */}
                <td className="px-4 py-3 text-xs whitespace-nowrap">
                  {task.dueDate ? (
                    <span className={`flex items-center gap-1 ${isOverdue ? "text-rose-600 font-semibold" : "text-[var(--muted)]"}`}>
                      {isOverdue && <AlertCircle size={11} />}
                      {format(new Date(task.dueDate), "MMM d, yyyy")}
                    </span>
                  ) : (
                    <span className="text-[var(--muted)] italic">—</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  {canManage && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(task)}
                        className="p-1.5 rounded hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--navy)] transition-colors"
                        title="Edit task"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete "${task.title}"? This cannot be undone.`)) {
                            onDelete(task.id);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-rose-50 text-[var(--muted)] hover:text-rose-600 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
