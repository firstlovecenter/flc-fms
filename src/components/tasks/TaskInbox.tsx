"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Calendar,
  Check,
  ChevronDown,
  Flag,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createTask,
  deleteTask,
  toggleTaskComplete,
  updateTask,
} from "@/actions/task.actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { Card } from "@/components/ui/card";

type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type SerializedTask = {
  id: string;
  title: string;
  priority: TaskPriority | null;
  dueDate: string | null;
  completedAt: string | null;
  createdById: string;
  createdBy: string;
  assignedToId: string | null;
  assignedTo: string | null;
  maintenanceRequestId: string | null;
};

type Staff = { id: string; name: string; role: string };

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  HIGH:   "text-danger bg-danger/10 border-danger/25",
  MEDIUM: "text-warning bg-warning/10 border-warning/25",
  LOW:    "text-info bg-info/10 border-info/25",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dueLabel(iso: string) {
  const due = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return due.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function dueTone(iso: string, completed: boolean) {
  if (completed) return "text-[var(--muted)] bg-black/5 dark:bg-[rgba(255,255,255,0.06)] border-transparent";
  const due = startOfDay(new Date(iso)).getTime();
  const today = startOfDay(new Date()).getTime();
  if (due < today)  return "text-danger bg-danger/10 border-danger/25";
  if (due === today) return "text-warning bg-warning/10 border-warning/25";
  return "text-[var(--slate)] dark:text-[var(--muted)] bg-black/5 dark:bg-[rgba(255,255,255,0.06)] border-transparent";
}

export default function TaskInbox({
  openTasks,
  completedTasks,
  staff,
  currentUserId,
}: {
  openTasks: SerializedTask[];
  completedTasks: SerializedTask[];
  staff: Staff[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<"OPEN" | "COMPLETED">("OPEN");
  const [filter, setFilter] = useState<"ALL" | "MINE" | "DELEGATED">("ALL");
  const [editing, setEditing] = useState<SerializedTask | null>(null);
  // Optimistically toggled ids (flips render state before the server confirms)
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const source = view === "OPEN" ? openTasks : completedTasks;
  const tasks = useMemo(() => {
    let list = source;
    if (filter === "MINE")
      list = list.filter((t) => t.assignedToId === currentUserId && t.createdById !== currentUserId);
    if (filter === "DELEGATED")
      list = list.filter((t) => t.createdById === currentUserId && t.assignedToId && t.assignedToId !== currentUserId);
    return list;
  }, [source, filter, currentUserId]);

  const today = startOfDay(new Date()).getTime();
  const dueToday = openTasks.filter((t) => t.dueDate && startOfDay(new Date(t.dueDate)).getTime() === today).length;
  const overdue  = openTasks.filter((t) => t.dueDate && startOfDay(new Date(t.dueDate)).getTime() < today).length;

  function toggle(task: SerializedTask) {
    setPendingToggles((prev) => new Set(prev).add(task.id));
    startTransition(async () => {
      try {
        await toggleTaskComplete(task.id);
        router.refresh();
      } catch {
        toast.error("Could not update the task");
      } finally {
        setPendingToggles((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      }
    });
  }

  function remove(task: SerializedTask) {
    startTransition(async () => {
      try {
        await deleteTask(task.id);
        toast.success("Task deleted");
        router.refresh();
      } catch {
        toast.error("Could not delete the task");
      }
    });
  }

  return (
    <div className="space-y-6 animate-fade-in relative pb-32">
      {/* Ambient glow */}
      <div
        className="fixed top-[100px] -right-[80px] w-[350px] h-[350px] rounded-full pointer-events-none z-0"
        style={{ background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)" }}
      />

      {/* Hero header */}
      <PageHeader
        variant="hero"
        eyebrow="Facility Management"
        title="Tasks"
        description={`${openTasks.length} open task${openTasks.length !== 1 ? "s" : ""}`}
        className="relative z-10"
      />

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 relative z-10 stagger-children">
        <StatCard label="To Do"     value={openTasks.length} color="gold" />
        <StatCard label="Due Today" value={dueToday}         color="warning" />
        <StatCard label="Overdue"   value={overdue}          color="danger" />
      </div>

      {/* View + filter chips */}
      <div className="flex items-center justify-between gap-3 flex-wrap relative z-10">
        <div className="flex gap-2">
          {(["OPEN", "COMPLETED"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-4 py-2 rounded-full text-[0.8rem] font-semibold transition-all duration-150 border",
                view === v
                  ? "bg-[var(--navy)] dark:bg-[var(--navy-light)] text-white border-[rgba(200,163,90,0.3)] shadow-[0_4px_12px_rgba(10,22,40,0.15)] -translate-y-0.5"
                  : "bg-white/80 dark:bg-[rgba(255,255,255,0.06)] text-[var(--slate)] dark:text-[var(--muted)] border-[rgba(200,163,90,0.15)] hover:-translate-y-px hover:border-[rgba(200,163,90,0.3)]"
              )}
            >
              {v === "OPEN" ? "Open" : "Completed"}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(
            [
              ["ALL", "All"],
              ["MINE", "Assigned to me"],
              ["DELEGATED", "Delegated"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[0.72rem] font-semibold border transition-colors",
                filter === key
                  ? "border-[rgba(200,163,90,0.5)] text-[var(--navy)] bg-[rgba(200,163,90,0.12)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--navy)]"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="empty-state card relative z-10">
          <p>
            {view === "OPEN"
              ? "Nothing here â€” add a task below to get started."
              : "No completed tasks yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-2 relative z-10">
          {tasks.map((task) => {
            const optimistic = pendingToggles.has(task.id);
            const done = optimistic ? !task.completedAt : !!task.completedAt;
            return (
              <TaskRow
                key={task.id}
                task={task}
                done={done}
                currentUserId={currentUserId}
                onToggle={() => toggle(task)}
                onEdit={() => setEditing(task)}
                onDelete={() => remove(task)}
              />
            );
          })}
        </div>
      )}

      {/* Quick add â€” fixed to the bottom like the Trello inbox */}
      <QuickAddBar staff={staff} currentUserId={currentUserId} />

      {/* Edit dialog */}
      {editing && (
        <EditTaskDialog
          task={editing}
          staff={staff}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// â”€â”€â”€ Task row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TaskRow({
  task,
  done,
  currentUserId,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: SerializedTask;
  done: boolean;
  currentUserId: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const assignedToMe = task.assignedToId === currentUserId && task.createdById !== currentUserId;
  const delegated    = task.createdById === currentUserId && task.assignedToId && task.assignedToId !== currentUserId;

  return (
    <div
      className={cn(
        "card flex items-center gap-3 px-4 py-3 transition-all duration-200",
        done && "opacity-60"
      )}
    >
      {/* Complete toggle */}
      <button
        onClick={onToggle}
        aria-label={done ? "Mark as not done" : "Mark as done"}
        className={cn(
          "flex-shrink-0 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all duration-150",
          done
            ? "bg-success border-success text-white"
            : "border-[rgba(200,163,90,0.5)] hover:border-success hover:scale-110"
        )}
      >
        {done && <Check size={13} strokeWidth={3} />}
      </button>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[0.92rem] font-medium text-[var(--navy)] truncate",
            done && "line-through text-[var(--muted)] dark:text-[var(--muted)]"
          )}
        >
          {task.title}
        </p>
        {(task.dueDate || task.priority || assignedToMe || delegated || task.maintenanceRequestId) && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {task.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-semibold border",
                  dueTone(task.dueDate, done)
                )}
              >
                <Calendar size={11} /> {dueLabel(task.dueDate)}
              </span>
            )}
            {task.priority && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-semibold border",
                  PRIORITY_STYLES[task.priority]
                )}
              >
                <Flag size={11} /> {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
              </span>
            )}
            {assignedToMe && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-semibold text-[var(--slate)] dark:text-[var(--muted)] bg-black/5 dark:bg-[rgba(255,255,255,0.06)]">
                <UserRound size={11} /> From {task.createdBy}
              </span>
            )}
            {delegated && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-semibold text-[var(--slate)] dark:text-[var(--muted)] bg-black/5 dark:bg-[rgba(255,255,255,0.06)]">
                <UserRound size={11} /> {task.assignedTo}
              </span>
            )}
            {task.maintenanceRequestId && (
              <Link
                href={`/maintenance/${task.maintenanceRequestId}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.68rem] font-semibold text-gold bg-gold/10 border border-gold/25 hover:bg-gold/20"
              >
                <Wrench size={11} /> Maintenance
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Task actions"
          className="flex-shrink-0 p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--navy)] hover:bg-black/5 dark:hover:bg-[rgba(255,255,255,0.1)] transition-colors"
        >
          <MoreHorizontal size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil size={14} /> Edit
          </DropdownMenuItem>
          {!task.maintenanceRequestId && !done && (
            <DropdownMenuItem
              render={<Link href={`/maintenance/new?taskId=${task.id}&title=${encodeURIComponent(task.title)}`} />}
            >
              <Wrench size={14} /> Convert to maintenance
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 size={14} /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// â”€â”€â”€ Quick add bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function QuickAddBar({
  staff,
  currentUserId,
}: {
  staff: Staff[];
  currentUserId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"" | TaskPriority>("");
  const [assignedToId, setAssignedToId] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    const trimmed = title.trim();
    if (!trimmed || isPending) return;

    startTransition(async () => {
      try {
        await createTask({
          title: trimmed,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          priority: priority || undefined,
          assignedToId: assignedToId || undefined,
        });
        setTitle("");
        setDueDate("");
        setPriority("");
        setAssignedToId("");
        router.refresh();
        inputRef.current?.focus();
      } catch {
        toast.error("Could not add the task");
      }
    });
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-[560px] z-30">
      <Card className="shadow-[0_12px_32px_rgba(10,22,40,0.25)] border-[rgba(200,163,90,0.3)] p-3 space-y-2 backdrop-blur-md">
        {showDetails && (
          <div className="grid grid-cols-3 gap-2 animate-fade-in">
            <div>
              <label className="block text-[0.65rem] font-semibold text-[var(--muted)] mb-1 uppercase tracking-wide">Due</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-[0.8rem]"
              />
            </div>
            <div>
              <label className="block text-[0.65rem] font-semibold text-[var(--muted)] mb-1 uppercase tracking-wide">Priority</label>
              <NativeSelect
                value={priority}
                onChange={(e) => setPriority(e.target.value as "" | TaskPriority)}
                className="!py-1.5 !text-[0.8rem]"
              >
                <option value="">None</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </NativeSelect>
            </div>
            <div>
              <label className="block text-[0.65rem] font-semibold text-[var(--muted)] mb-1 uppercase tracking-wide">Assign to</label>
              <NativeSelect
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="!py-1.5 !text-[0.8rem]"
              >
                <option value="">Me</option>
                {staff
                  .filter((s) => s.id !== currentUserId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
              </NativeSelect>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Add a taskâ€¦"
            className="flex-1"
            maxLength={300}
          />
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            aria-label="Toggle task details"
            className={cn(
              "p-2 rounded-lg border transition-colors",
              showDetails
                ? "border-[rgba(200,163,90,0.5)] text-[var(--navy)] bg-[rgba(200,163,90,0.12)]"
                : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--navy)]"
            )}
          >
            <ChevronDown size={16} className={cn("transition-transform", showDetails && "rotate-180")} />
          </button>
          <Button
            type="button"
            onClick={submit}
            disabled={!title.trim() || isPending}
            className="gap-1.5"
          >
            <Plus size={16} /> Add
          </Button>
        </div>
      </Card>
    </div>
  );
}

// â”€â”€â”€ Edit dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function EditTaskDialog({
  task,
  staff,
  onClose,
}: {
  task: SerializedTask;
  staff: Staff[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : "");
  const [priority, setPriority] = useState<"" | TaskPriority>(task.priority ?? "");
  const [assignedToId, setAssignedToId] = useState(task.assignedToId ?? "");
  const [isPending, startTransition] = useTransition();

  function save() {
    const trimmed = title.trim();
    if (!trimmed || isPending) return;

    startTransition(async () => {
      try {
        await updateTask(task.id, {
          title: trimmed,
          dueDate: dueDate ? new Date(dueDate) : null,
          priority: priority || null,
          assignedToId: assignedToId || null,
        });
        toast.success("Task updated");
        router.refresh();
        onClose();
      } catch {
        toast.error("Could not update the task");
      }
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              maxLength={300}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="block text-sm font-medium text-[var(--slate)] mb-1">Due date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-[var(--slate)] mb-1">Priority</Label>
              <NativeSelect
                value={priority}
                onChange={(e) => setPriority(e.target.value as "" | TaskPriority)}
                className="w-full"
              >
                <option value="">None</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </NativeSelect>
            </div>
          </div>

          <div>
            <Label className="block text-sm font-medium text-[var(--slate)] mb-1">Assigned to</Label>
            <NativeSelect
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="w-full"
            >
              <option value="">Unassigned (mine)</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </NativeSelect>
          </div>

          <div className="flex gap-3 pt-1">
            <Button onClick={save} disabled={!title.trim() || isPending} className="flex-1">
              {isPending ? "Savingâ€¦" : "Save"}
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
