"use client";

import React, { useState, useMemo } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { Plus, LayoutGrid, List, User } from "lucide-react";
import { moveTask, deleteTask } from "@/actions/task.actions";
import TaskColumn from "./TaskColumn";
import TaskListView from "./TaskListView";
import TaskMyView from "./TaskMyView";
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
  const [view,  setView]  = useState<"kanban" | "list" | "my">("kanban");
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

  async function handleStatusChange(taskId: string, status: "TODO" | "IN_PROGRESS" | "DONE") {
    const previousTasks = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    try {
      const res = await moveTask(taskId, { status });
      if (!res.success) {
        setTasks(previousTasks);
        toast.error("Failed to update status");
      }
    } catch {
      setTasks(previousTasks);
      toast.error("Failed to update status");
    }
  }

  // ── View toggle button helper ──────────────────────────────────────────────
  function ViewBtn({ id, icon: Icon, label }: { id: "kanban" | "list" | "my"; icon: React.ElementType; label: string }) {
    const active = view === id;
    return (
      <button
        type="button"
        onClick={() => setView(id)}
        title={label}
        className={[
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
          active
            ? "bg-[var(--navy)] text-[var(--cream)] border-[var(--navy)]"
            : "bg-white text-[var(--muted)] border-[var(--border)] hover:border-[var(--navy)] hover:text-[var(--navy)]",
        ].join(" ")}
      >
        <Icon size={13} />
        <span className="hidden sm:inline">{label}</span>
      </button>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]">Task Board</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            {view === "kanban" ? " · drag cards to update status" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-[var(--border)] bg-[var(--cream)]">
            <ViewBtn id="kanban" icon={LayoutGrid} label="Kanban" />
            <ViewBtn id="list"   icon={List}        label="List"   />
            <ViewBtn id="my"     icon={User}        label="My Tasks" />
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
      </div>

      {/* Kanban view */}
      {view === "kanban" && (
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
      )}

      {/* List view */}
      {view === "list" && (
        <TaskListView
          tasks={tasks}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onEdit={openEdit}
          onDelete={handleDeleteTask}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* My Tasks view */}
      {view === "my" && (
        <TaskMyView
          tasks={tasks}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onEdit={openEdit}
          onDelete={handleDeleteTask}
          onStatusChange={handleStatusChange}
        />
      )}

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
