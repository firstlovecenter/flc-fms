"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { cancelBooking } from "@/actions/booking.actions";

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm("Cancel this booking? This cannot be undone.")) return;
    setLoading(true);
    const result = await cancelBooking(bookingId);
    if ("error" in result && result.error) alert(result.error as string);
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="btn-danger flex items-center gap-2 disabled:opacity-50"
    >
      <XCircle size={16} />
      {loading ? "Cancelling…" : "Cancel Booking"}
    </button>
  );
}
