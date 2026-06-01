import DutyLogPanel from "./DutyLogPanel";
import type { SerializedDutyLog } from "./types";

export default function DutyDayView({ logs }: { logs: SerializedDutyLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--cream-dark)] p-12 text-center">
        <p className="text-xl text-[var(--muted)]">No duty logs assigned for this day.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-3">
      {logs.map((log) => (
        <DutyLogPanel key={log.id} log={log} readOnly compact />
      ))}
    </div>
  );
}
