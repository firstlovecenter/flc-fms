"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { completeBooking } from "@/actions/booking.actions";

export default function CompleteBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    if (!confirm("Mark this booking as completed?")) return;
    setLoading(true);
    const result = await completeBooking(bookingId);
    if ("error" in result && result.error) alert(result.error as string);
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleComplete}
      disabled={loading}
      className="btn-primary flex items-center gap-2 disabled:opacity-50"
    >
      <CheckCircle size={16} />
      {loading ? "Completing…" : "Mark Completed"}
    </button>
  );
}
