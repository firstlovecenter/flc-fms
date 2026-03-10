"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMaintenanceRequest } from "@/actions/maintenance.actions";

export default function MaintenanceStatusUpdate({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const nextStatuses: Record<string, { label: string; value: string; cls: string }[]> = {
    OPEN:        [{ label: "Start", value: "IN_PROGRESS", cls: "btn-primary" }],
    IN_PROGRESS: [
      { label: "Resolve", value: "RESOLVED",    cls: "btn-primary" },
      { label: "Close",   value: "CLOSED",      cls: "btn-secondary" },
    ],
    RESOLVED:    [{ label: "Close", value: "CLOSED", cls: "btn-secondary" }],
  };

  const actions = nextStatuses[currentStatus] ?? [];
  if (actions.length === 0) return null;

  async function handleUpdate(status: string) {
    setLoading(true);
    await updateMaintenanceRequest(requestId, { status: status as "IN_PROGRESS" | "RESOLVED" | "CLOSED" });
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex gap-2 shrink-0">
      {actions.map((a) => (
        <button
          key={a.value}
          onClick={() => handleUpdate(a.value)}
          disabled={loading}
          className={`${a.cls} text-xs disabled:opacity-50`}
        >
          {loading ? "…" : a.label}
        </button>
      ))}
    </div>
  );
}
