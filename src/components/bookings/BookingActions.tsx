"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { approveBooking, rejectBooking } from "@/actions/booking.actions";

export default function BookingActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [waiveBilling, setWaiveBilling] = useState(false);

  async function handleApprove() {
    setLoading("approve");
    await approveBooking(bookingId, waiveBilling);
    router.refresh();
    setLoading(null);
  }

  async function handleReject() {
    if (!reason.trim()) return;
    setLoading("reject");
    await rejectBooking(bookingId, reason);
    router.refresh();
    setLoading(null);
    setShowReject(false);
  }

  if (showReject) {
    return (
      <div className="flex items-center gap-1">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason…"
          className="input text-xs py-1 w-28"
          autoFocus
        />
        <button
          onClick={handleReject}
          disabled={!reason.trim() || loading === "reject"}
          className="p-1.5 rounded bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50"
        >
          <Check size={12} />
        </button>
        <button
          onClick={() => setShowReject(false)}
          className="p-1.5 rounded bg-gray-100 text-[var(--muted)] hover:bg-gray-200"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1 text-xs text-[var(--muted)] cursor-pointer">
        <input
          type="checkbox"
          checked={waiveBilling}
          onChange={(e) => setWaiveBilling(e.target.checked)}
          className="rounded border-gray-300"
        />
        Waive billing
      </label>
      <button
        onClick={handleApprove}
        disabled={loading === "approve"}
        className="p-1.5 rounded bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50"
        title="Approve"
      >
        <Check size={14} />
      </button>
      <button
        onClick={() => setShowReject(true)}
        className="p-1.5 rounded bg-red-100 text-red-600 hover:bg-red-200"
        title="Reject"
      >
        <X size={14} />
      </button>
    </div>
  );
}
