"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { togglePaymentGateway } from "@/actions/payment.actions";

export default function GatewayToggle({ provider, isActive }: { provider: "PAYSTACK" | "HUBTEL"; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    const result = await togglePaymentGateway(provider, !isActive);
    if ("error" in result && result.error) {
      alert(result.error as string);
    }
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
        isActive ? "bg-green-500" : "bg-gray-300"
      }`}
      title={isActive ? `Disable ${provider}` : `Enable ${provider}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          isActive ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
