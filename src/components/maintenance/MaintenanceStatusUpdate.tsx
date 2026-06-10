"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMaintenanceRequest } from "@/actions/maintenance.actions";
import { Button } from "@/components/ui/button";

export default function MaintenanceStatusUpdate({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const nextStatuses: Record<string, { label: string; value: string; variant: "default" | "outline" }[]> = {
    OPEN:        [{ label: "Start", value: "IN_PROGRESS", variant: "default" }],
    IN_PROGRESS: [
      { label: "Resolve", value: "RESOLVED",    variant: "default" },
      { label: "Close",   value: "CLOSED",      variant: "outline" },
    ],
    RESOLVED:    [{ label: "Close", value: "CLOSED", variant: "outline" }],
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
        <Button
          key={a.value}
          variant={a.variant}
          size="sm"
          onClick={() => handleUpdate(a.value)}
          disabled={loading}
        >
          {loading ? "…" : a.label}
        </Button>
      ))}
    </div>
  );
}
