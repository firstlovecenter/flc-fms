"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteBooking } from "@/actions/booking.actions";
import { Button } from "@/components/ui/button";

export default function DeleteBookingButton({
  bookingId,
  onDeleted,
  redirectTo,
}: {
  bookingId: string;
  onDeleted?: () => void;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await deleteBooking(bookingId);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error as string);
      return;
    }
    onDeleted?.();
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-1.5">
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-danger font-medium">Permanently delete this booking?</span>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting…" : "Confirm delete"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={loading}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button type="button" variant="destructive" onClick={() => setConfirming(true)} className="gap-2">
      <Trash2 size={16} /> Delete Booking
    </Button>
  );
}
