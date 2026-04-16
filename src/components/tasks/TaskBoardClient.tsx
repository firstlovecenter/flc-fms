"use client";

import { useState, useMemo } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { moveTask, deleteTask } from "@/actions/task.actions";
import TaskColumn from "./TaskColumn";
import TaskFormModal from "./TaskFormModal";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskUser = { id: string; name: string };

export type TaskWithRelations = {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  dueDate: Date | null;
  assignedToId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: TaskUser;
  assignedTo: TaskUser | null;
};

type ColumnId = "TODO" | "IN_PROGRESS" | "DONE";

// ─── Column definitions ───────────────────────────────────────────────────────

const COLUMNS: { id: ColumnId; label: string }[] = [
  { id: "TODO",        label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "DONE",        label: "Done" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskBoardClientProps {
  initialTasks: TaskWithRelations[];
  staffUsers: { id: string; name: string }[];
  currentUserId: string;
  currentUserRole: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TaskBoardClient({
  initialTasks,
  staffUsers,
  currentUserId,
  currentUserRole,
}: TaskBoardClientProps) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>(initialTasks);
  const [modal, setModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    task?: TaskWithRelations;
  }>({ open: false, mode: "create" });

  // ── Group tasks by status ──────────────────────────────────────────────────
  const tasksByStatus = useMemo(
    () => ({
      TODO:        tasks.filter((t) => t.status === "TODO"),
      IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS"),
      DONE:        tasks.filter((t) => t.status === "DONE"),
    }),
    [tasks]
  );

  // ── Drag-and-drop ──────────────────────────────────────────────────────────
  async function handleDragEnd(result: DropResult) {
    const { draggableId, destination, source } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    const newStatus = destination.droppableId as ColumnId;
    const previousTasks = tasks;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await moveTask(draggableId, { status: newStatus });
      if (!res.success) {
        setTasks(previousTasks);
        toast.error("Failed to move task");
      }
    } catch {
      setTasks(previousTasks);
      toast.error("Failed to move task — changes reverted");
    }
  }

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  function handleTaskCreated(task: TaskWithRelations) {
    setTasks((prev) => [...prev, task]);
  }

  function handleTaskUpdated(task: TaskWithRelations) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
  }

  async function handleDeleteTask(taskId: string) {
    const previousTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId)); // optimistic

    try {
      const res = await deleteTask(taskId);
      if (!res.success) {
        setTasks(previousTasks);
        toast.error(res.error ?? "Could not delete task");
      } else {
        toast.success("Task deleted");
      }
    } catch {
      setTasks(previousTasks);
      toast.error("Failed to delete task");
    }
  }

  function openEdit(task: TaskWithRelations) {
    setModal({ open: true, mode: "edit", task });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--cream)]">Task Board</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} · drag cards to update status
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ open: true, mode: "create" })}
          className="btn-primary flex items-center gap-2 shrink-0"
        >
          <Plus size={16} />
          New Task
        </button>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {COLUMNS.map((col) => (
            <TaskColumn
              key={col.id}
              columnId={col.id}
              label={col.label}
              tasks={tasksByStatus[col.id]}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onEdit={openEdit}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Modal */}
      <TaskFormModal
        open={modal.open}
        onOpenChange={(open) => setModal((m) => ({ ...m, open }))}
        mode={modal.mode}
        task={modal.task}
        staffUsers={staffUsers}
        onCreated={handleTaskCreated}
        onUpdated={handleTaskUpdated}
      />
    </div>
  );
}
