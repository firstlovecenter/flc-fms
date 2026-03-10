"use client";

import { useState } from "react";
import { initiatePayment } from "@/actions/payment.actions";

export default function PayNowButton({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    const result = await initiatePayment(bookingId);
    if ("error" in result && result.error) {
      setError(result.error as string);
      setLoading(false);
      return;
    }
    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
    }
  }

  return (
    <div>
      <button onClick={handlePay} disabled={loading} className="btn-primary text-xs disabled:opacity-50">
        {loading ? "Redirecting…" : "Pay Now"}
      </button>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
