"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { approveBooking, rejectBooking } from "@/actions/booking.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function BookingActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [waiveBilling, setWaiveBilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setLoading("approve");
    setError(null);
    try {
      const result = await approveBooking(bookingId, waiveBilling);
      if ("error" in result) {
        setError(result.error as string);
      } else {
        router.refresh();
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to approve booking. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    if (!reason.trim()) return;
    setLoading("reject");
    setError(null);
    try {
      const result = await rejectBooking(bookingId, reason);
      if ("error" in result) {
        setError(result.error as string);
      } else {
        router.refresh();
        setShowReject(false);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to reject booking. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  if (showReject) {
    return (
      <div className="flex flex-col gap-2">
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection…"
            className="w-48"
            autoFocus
          />
          <Button
            type="button"
            variant="destructive"
            onClick={handleReject}
            disabled={!reason.trim() || loading === "reject"}
            className="gap-1.5"
          >
            <Check size={14} /> {loading === "reject" ? "Rejecting…" : "Confirm reject"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setShowReject(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleApprove} disabled={loading === "approve"} className="gap-2">
          <Check size={16} /> {loading === "approve" ? "Approving…" : "Approve"}
        </Button>
        <Button type="button" variant="destructive" onClick={() => setShowReject(true)} className="gap-2">
          <X size={16} /> Reject
        </Button>
        <label className="ml-1 flex items-center gap-1.5 text-xs text-[var(--muted)] cursor-pointer">
          <input
            type="checkbox"
            checked={waiveBilling}
            onChange={(e) => setWaiveBilling(e.target.checked)}
            className="rounded border-gray-300"
          />
          Waive billing
        </label>
      </div>
    </div>
  );
}
