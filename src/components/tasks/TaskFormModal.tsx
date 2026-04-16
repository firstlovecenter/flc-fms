"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createTask, updateTask } from "@/actions/task.actions";
import type { TaskWithRelations } from "./TaskBoardClient";

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
  title:        z.string().min(2, "Title must be at least 2 characters"),
  description:  z.string().optional(),
  priority:     z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  dueDate:      z.string().optional(),
  assignedToId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  task?: TaskWithRelations;
  staffUsers: { id: string; name: string }[];
  onCreated: (task: TaskWithRelations) => void;
  onUpdated: (task: TaskWithRelations) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TaskFormModal({
  open,
  onOpenChange,
  mode,
  task,
  staffUsers,
  onCreated,
  onUpdated,
}: TaskFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { priority: "MEDIUM" },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (mode === "edit" && task) {
        reset({
          title:        task.title,
          description:  task.description ?? "",
          priority:     task.priority,
          dueDate:      task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
          assignedToId: task.assignedToId ?? "",
        });
      } else {
        reset({ priority: "MEDIUM", title: "", description: "", dueDate: "", assignedToId: "" });
      }
    }
  }, [open, mode, task, reset]);

  async function onSubmit(data: FormData) {
    const payload = {
      title:        data.title,
      description:  data.description || undefined,
      priority:     data.priority,
      dueDate:      data.dueDate ? new Date(data.dueDate) : undefined,
      assignedToId: data.assignedToId || undefined,
    };

    if (mode === "create") {
      const result = await createTask(payload);
      if (result.success) {
        onCreated(result.task);
        onOpenChange(false);
        toast.success(`"${result.task.title}" created`);
      } else {
        toast.error("Failed to create task");
      }
    } else if (mode === "edit" && task) {
      const result = await updateTask(task.id, {
        ...payload,
        dueDate:      data.dueDate ? new Date(data.dueDate) : null,
        assignedToId: data.assignedToId || null,
      });
      if (result.success) {
        onUpdated(result.task);
        onOpenChange(false);
        toast.success(`"${result.task.title}" updated`);
      } else {
        toast.error(result.error ?? "Failed to update task");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Task" : "Edit Task"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              {...register("title")}
              className="input"
              placeholder="e.g. Prepare sanctuary for Sunday service"
            />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">
              Description <span className="text-[var(--muted)] font-normal">(optional)</span>
            </label>
            <textarea
              {...register("description")}
              className="input"
              rows={3}
              placeholder="Add more context or steps…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-[var(--slate)] mb-1">Priority</label>
              <select {...register("priority")} className="input">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Due date */}
            <div>
              <label className="block text-sm font-medium text-[var(--slate)] mb-1">
                Due Date <span className="text-[var(--muted)] font-normal">(optional)</span>
              </label>
              <input {...register("dueDate")} type="date" className="input" />
            </div>
          </div>

          {/* Assign to */}
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">
              Assign To <span className="text-[var(--muted)] font-normal">(optional)</span>
            </label>
            <select {...register("assignedToId")} className="input">
              <option value="">— Unassigned —</option>
              {staffUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full sm:w-auto"
            >
              {isSubmitting
                ? mode === "create" ? "Creating…" : "Saving…"
                : mode === "create" ? "Create Task" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="btn-secondary w-full sm:w-auto"
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
