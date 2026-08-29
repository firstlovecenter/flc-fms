"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateFacilityFeedback } from "@/actions/feedback.actions";
import { Button } from "@/components/ui/button";

const NEXT_STATUSES: Record<
  string,
  { label: string; value: "IN_REVIEW" | "RESOLVED" | "CLOSED"; variant: "default" | "outline" }[]
> = {
  OPEN: [{ label: "Mark In Review", value: "IN_REVIEW", variant: "default" }],
  IN_REVIEW: [
    { label: "Resolve", value: "RESOLVED", variant: "default" },
    { label: "Close", value: "CLOSED", variant: "outline" },
  ],
  RESOLVED: [{ label: "Close", value: "CLOSED", variant: "outline" }],
};

export default function FeedbackStatusUpdate({
  feedbackId,
  currentStatus,
  compact = false,
}: {
  feedbackId: string;
  currentStatus: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const actions = NEXT_STATUSES[currentStatus] ?? [];
  if (actions.length === 0) return null;

  async function handleUpdate(status: "IN_REVIEW" | "RESOLVED" | "CLOSED") {
    setLoading(true);
    await updateFacilityFeedback(feedbackId, { status });
    router.refresh();
    setLoading(false);
  }

  return (
    <div className={`flex gap-2 shrink-0 ${compact ? "flex-col sm:flex-row" : ""}`}>
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
