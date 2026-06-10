"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  completeDutyItem,
  signDutyAsAssignee,
  signDutyAsSupervisor,
} from "@/actions/duty.actions";
import { formatDutyDate, formatDutyTime } from "@/lib/duty/format";
import type { SerializedDutyLog } from "./types";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type DutyLogPanelProps = {
  log: SerializedDutyLog;
  readOnly?: boolean;
  currentUserId?: string;
  canManage?: boolean;
  compact?: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "In progress",
  COMPLETED: "All tasks done",
  SIGNED_OFF: "Signed off",
};

export default function DutyLogPanel({
  log,
  readOnly = false,
  currentUserId,
  canManage = false,
  compact = false,
}: DutyLogPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isChecklist = log.template.type === "CHECKLIST";
  const isAssignee = currentUserId === log.assignedTo.id;
  const canEditItems =
    !readOnly &&
    log.status !== "SIGNED_OFF" &&
    (isAssignee || canManage);

  const canSignAssignee =
    !readOnly &&
    log.status !== "SIGNED_OFF" &&
    (isAssignee || canManage) &&
    !log.assigneeSignedAt;
  const canSignSupervisor =
    !readOnly &&
    canManage &&
    log.status !== "SIGNED_OFF" &&
    log.items.every((i) => i.isDone);

  function refresh() {
    router.refresh();
  }

  function toggleItem(itemId: string, isDone: boolean) {
    startTransition(async () => {
      const res = await completeDutyItem(log.id, itemId, isDone);
      if (!res.success) {
        toast.error(res.error ?? "Could not update task");
        return;
      }
      refresh();
    });
  }

  function handleAssigneeSign() {
    startTransition(async () => {
      const res = await signDutyAsAssignee(log.id);
      if (!res.success) {
        toast.error(res.error ?? "Could not sign");
        return;
      }
      toast.success("Signed");
      refresh();
    });
  }

  function handleSupervisorSign() {
    startTransition(async () => {
      const res = await signDutyAsSupervisor(log.id);
      if (!res.success) {
        toast.error(res.error ?? "Could not sign off");
        return;
      }
      toast.success("Duty log signed off");
      refresh();
    });
  }

  const assigneeLabel = isChecklist ? "Vicar" : "Name of man on duty";

  return (
    <Card
      className={cn(
        "rounded-xl overflow-hidden shadow-sm",
        compact && "text-sm",
      )}
    >
      <header
        className="px-4 py-3"
        style={{
          background: "var(--duty-board-panel-header-bg)",
          color: "var(--duty-board-panel-header-fg)",
        }}
      >
        <h2 className={cn("font-bold", compact ? "text-base" : "text-lg")}>
          {log.template.name}
        </h2>
        <p className="text-sm mt-0.5 opacity-80">
          {formatDutyDate(new Date(log.date))}
        </p>
      </header>

      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--cream-dark)]">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <p>
            <span className="text-[var(--muted)]">{assigneeLabel}:</span>{" "}
            <strong className="text-[var(--navy)]">{log.assignedTo.name}</strong>
          </p>
          <p>
            <span className="text-[var(--muted)]">Status:</span>{" "}
            <strong className="text-[var(--navy)]">
              {STATUS_LABELS[log.status] ?? log.status}
            </strong>
          </p>
        </div>
      </div>

      {isChecklist ? (
        <ul className="divide-y divide-[var(--border)]">
          {log.items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3">
              {canEditItems ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => toggleItem(item.id, !item.isDone)}
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                    item.isDone
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-[var(--border)] hover:border-[var(--navy)]",
                  )}
                  aria-label={item.isDone ? "Mark incomplete" : "Mark done"}
                >
                  {item.isDone && <Check className="h-3 w-3" />}
                </button>
              ) : (
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                    item.isDone
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-[var(--border)]",
                  )}
                >
                  {item.isDone && <Check className="h-3 w-3" />}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    item.isDone && "text-[var(--muted)] line-through",
                  )}
                >
                  {item.description}
                </p>
                {item.isDone && item.signedBy && (
                  <p className="text-xs text-[var(--muted)] mt-1">
                    {item.signedBy.name}
                    {item.completedAt &&
                      ` · ${format(new Date(item.completedAt), "h:mm a")}`}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--cream-dark)]">
                <th className="text-left px-4 py-2 font-semibold text-[var(--navy)] w-28">
                  Time
                </th>
                <th className="text-left px-4 py-2 font-semibold text-[var(--navy)]">
                  Task
                </th>
                <th className="text-center px-2 py-2 font-semibold text-[var(--navy)] w-16">
                  Done
                </th>
                <th className="text-left px-4 py-2 font-semibold text-[var(--navy)] w-36">
                  Signature
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {log.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2.5 text-[var(--muted)] whitespace-nowrap">
                    {formatDutyTime(item.timeType, item.scheduledTime)}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--navy)]">
                    {item.description}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    {canEditItems ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => toggleItem(item.id, !item.isDone)}
                        className={cn(
                          "mx-auto flex h-6 w-6 items-center justify-center rounded border-2",
                          item.isDone
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-[var(--border)] hover:border-[var(--navy)]",
                        )}
                      >
                        {item.isDone && <Check className="h-3.5 w-3.5" />}
                      </button>
                    ) : (
                      <span
                        className={cn(
                          "mx-auto flex h-6 w-6 items-center justify-center rounded border-2",
                          item.isDone
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-[var(--border)]",
                        )}
                      >
                        {item.isDone && <Check className="h-3.5 w-3.5" />}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--muted)]">
                    {item.isDone && item.signedBy ? (
                      <>
                        <span className="font-medium text-[var(--navy)]">
                          {item.signedBy.name}
                        </span>
                        {item.completedAt && (
                          <span className="block">
                            {format(new Date(item.completedAt), "h:mm a")}
                          </span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="px-4 py-3 border-t border-[var(--border)] bg-[var(--cream-dark)] space-y-3">
        {isChecklist && (
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[var(--muted)] text-xs uppercase tracking-wide mb-1">
                Vicar&apos;s signature
              </p>
              {log.assigneeSignedAt ? (
                <p className="font-medium text-[var(--navy)]">
                  {log.assignedTo.name} ·{" "}
                  {format(new Date(log.assigneeSignedAt), "d MMM yyyy, h:mm a")}
                </p>
              ) : canSignAssignee ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleAssigneeSign}
                  className="text-sm text-[var(--gold)] hover:underline font-medium"
                >
                  Sign as vicar
                </button>
              ) : (
                <p className="text-[var(--muted)]">Pending</p>
              )}
            </div>
            <div>
              <p className="text-[var(--muted)] text-xs uppercase tracking-wide mb-1">
                Supervisor&apos;s signature
              </p>
              {log.supervisorSignedAt && log.supervisor ? (
                <p className="font-medium text-[var(--navy)]">
                  {log.supervisor.name} ·{" "}
                  {format(new Date(log.supervisorSignedAt), "d MMM yyyy, h:mm a")}
                </p>
              ) : canSignSupervisor ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={handleSupervisorSign}
                  className="text-xs py-1.5 px-3 gap-1"
                >
                  {pending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Supervisor sign-off
                </Button>
              ) : (
                <p className="text-[var(--muted)]">Pending</p>
              )}
            </div>
          </div>
        )}

        {!isChecklist && (
          <div>
            <p className="text-[var(--muted)] text-xs uppercase tracking-wide mb-1">
              Supervisor&apos;s signature
            </p>
            {log.supervisorSignedAt && log.supervisor ? (
              <p className="font-medium text-[var(--navy)] text-sm">
                {log.supervisor.name} ·{" "}
                {format(new Date(log.supervisorSignedAt), "d MMM yyyy, h:mm a")}
              </p>
            ) : canSignSupervisor ? (
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={handleSupervisorSign}
                className="text-xs py-1.5 px-3 gap-1"
              >
                {pending && <Loader2 className="h-3 w-3 animate-spin" />}
                Supervisor sign-off
              </Button>
            ) : (
              <p className="text-[var(--muted)] text-sm">Pending</p>
            )}
          </div>
        )}
      </footer>
    </Card>
  );
}
