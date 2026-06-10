"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { completeBooking } from "@/actions/booking.actions";
import { Button } from "@/components/ui/button";

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
    <Button
      onClick={handleComplete}
      disabled={loading}
      className="gap-2"
    >
      <CheckCircle size={16} />
      {loading ? "Completing…" : "Mark Completed"}
    </Button>
  );
}
