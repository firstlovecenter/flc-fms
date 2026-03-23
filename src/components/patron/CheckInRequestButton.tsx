"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { requestCheckIn } from "@/actions/checkin.actions";

export default function CheckInRequestButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRequest() {
    if (!confirm("Request check-in for this booking? Staff will be notified.")) return;
    setLoading(true);
    const result = await requestCheckIn(bookingId);
    if (result && "error" in result) {
      alert(result.error);
    }
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleRequest}
      disabled={loading}
      className="btn-primary flex items-center gap-2 disabled:opacity-50"
    >
      <LogIn size={16} />
      {loading ? "Requesting…" : "Request Check-In"}
    </button>
  );
}
