"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteDutyLog } from "@/actions/duty.actions";
import { formatDutyDate } from "@/lib/duty/format";
import type { SerializedDutyLog } from "./types";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  COMPLETED:
    "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
  SIGNED_OFF:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
};

export default function DutyLogListClient({
  logs,
  selectedDate,
  canManage,
}: {
  logs: SerializedDutyLog[];
  selectedDate: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete duty log for ${name}?`)) return;
    startTransition(async () => {
      const res = await deleteDutyLog(id);
      if (!res.success) {
        toast.error(res.error ?? "Could not delete");
        return;
      }
      toast.success("Duty log deleted");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <form method="get" className="flex items-center gap-2">
          <label htmlFor="date" className="text-sm text-[var(--muted)]">
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={selectedDate}
            className="input"
            onChange={(e) => {
              const params = new URLSearchParams();
              params.set("date", e.target.value);
              router.push(`/duty?${params.toString()}`);
            }}
          />
        </form>
      </div>

      {logs.length === 0 ? (
        <div className="card p-10 text-center text-[var(--muted)]">
          <p>
            {canManage
              ? `No duty logs for ${formatDutyDate(new Date(selectedDate))}.`
              : `You have no duties assigned for ${formatDutyDate(new Date(selectedDate))}.`}
          </p>
          {canManage && (
            <p className="mt-3 text-sm">
              Use <span className="text-[var(--navy)] font-medium">Assign duty</span> in
              the header to create one.
            </p>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--cream-dark)]">
                <th className="text-left px-4 py-3 font-semibold text-[var(--navy)]">Form</th>
                {canManage && (
                  <th className="text-left px-4 py-3 font-semibold text-[var(--navy)]">Assigned to</th>
                )}
                <th className="text-left px-4 py-3 font-semibold text-[var(--navy)]">Progress</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--navy)]">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {logs.map((log) => {
                const done = log.items.filter((i) => i.isDone).length;
                const total = log.items.length;
                return (
                  <tr key={log.id} className="hover:bg-[var(--cream-dark)]/80">
                    <td className="px-4 py-3 font-medium text-[var(--navy)]">
                      <Link href={`/duty/${log.id}`} className="hover:text-[var(--gold)]">
                        {log.template.name}
                      </Link>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">{log.assignedTo.name}</td>
                    )}
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {done}/{total} tasks
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[log.status] ?? ""
                        }`}
                      >
                        {log.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/duty/${log.id}`}
                          className="text-[var(--gold)] hover:underline text-xs"
                        >
                          Open
                        </Link>
                        {canManage && log.status !== "SIGNED_OFF" && (
                          <Link
                            href={`/duty/${log.id}/edit`}
                            className="text-[var(--muted)] hover:text-[var(--navy)] text-xs"
                          >
                            Edit
                          </Link>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => handleDelete(log.id, log.assignedTo.name)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
