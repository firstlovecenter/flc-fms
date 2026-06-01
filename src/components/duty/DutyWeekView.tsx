import { addDays, format, isSameDay } from "date-fns";
import type { SerializedDutyLog } from "./types";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40",
  COMPLETED:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/40",
  SIGNED_OFF:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/40",
};

export default function DutyWeekView({
  logs,
  weekStartIso,
}: {
  logs: SerializedDutyLog[];
  weekStartIso: string;
}) {
  const weekStart = new Date(weekStartIso);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 min-h-[60vh]">
      {days.map((day) => {
        const dayLogs = logs.filter((log) =>
          isSameDay(new Date(log.date), day),
        );
        const isToday = isSameDay(day, new Date());

        return (
          <div
            key={day.toISOString()}
            className={`rounded-xl border flex flex-col min-h-[200px] ${
              isToday
                ? "border-[var(--gold)] bg-[var(--gold-pale)] dark:bg-[var(--gold)]/10"
                : "border-[var(--border)] bg-[var(--cream-dark)]"
            }`}
          >
            <div
              className={`px-3 py-2.5 border-b ${
                isToday ? "border-[var(--gold)]/40" : "border-[var(--border)]"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {format(day, "EEE")}
              </p>
              <p className="text-lg font-bold text-[var(--duty-board-fg)]">
                {format(day, "d MMM")}
              </p>
            </div>

            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[70vh]">
              {dayLogs.length === 0 ? (
                <p className="text-xs text-[var(--muted)] text-center py-6 px-1">
                  No duties
                </p>
              ) : (
                dayLogs.map((log) => {
                  const done = log.items.filter((i) => i.isDone).length;
                  const total = log.items.length;
                  return (
                    <div key={log.id} className="card p-2.5 shadow-sm">
                      <p className="text-xs font-semibold leading-snug line-clamp-2 text-[var(--navy)]">
                        {log.template.name}
                      </p>
                      <p className="text-xs text-[var(--muted)] mt-1 truncate">
                        {log.assignedTo.name}
                      </p>
                      <div className="flex items-center justify-between gap-1 mt-2">
                        <span className="text-[10px] text-[var(--muted)]">
                          {done}/{total} tasks
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                            STATUS_COLORS[log.status] ?? ""
                          }`}
                        >
                          {log.status === "SIGNED_OFF"
                            ? "Done"
                            : log.status === "COMPLETED"
                              ? "Complete"
                              : "Active"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
