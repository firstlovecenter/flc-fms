"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { approveExpense, rejectExpense } from "@/actions/expense.actions";

export default function ExpenseActions({
  expenseId,
  isLocked,
}: {
  expenseId: string;
  isLocked: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "approve" | "reject">(null);
  const [reason, setReason] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLocked) {
    return <span className="text-xs text-[var(--muted)]">Locked</span>;
  }

  async function handleApprove() {
    setLoading(true);
    setError(null);
    const result = await approveExpense(expenseId, parseFloat(chargeAmount) || 0);
    if (result && "error" in result) {
      setError(result.error as string);
    } else {
      router.refresh();
      setMode(null);
      setChargeAmount("");
    }
    setLoading(false);
  }

  async function handleReject() {
    if (!reason.trim()) return;
    setLoading(true);
    setError(null);
    const result = await rejectExpense(expenseId, reason);
    if (result && "error" in result && result.error) {
      setError(result.error as string);
    } else {
      router.refresh();
      setMode(null);
    }
    setLoading(false);
  }

  if (mode === "approve") {
    return (
      <div className="flex flex-col gap-1">
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
            {error}
          </p>
        )}
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            step="0.01"
            value={chargeAmount}
            onChange={(e) => setChargeAmount(e.target.value)}
            placeholder="Charge (GH₵)…"
            className="input text-xs py-1 w-28"
            autoFocus
          />
          <button
            onClick={handleApprove}
            disabled={loading}
            className="p-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
            title="Confirm approval"
          >
            <Check size={12} />
          </button>
          <button
            onClick={() => { setMode(null); setChargeAmount(""); setError(null); }}
            className="p-1.5 rounded bg-gray-100 text-[var(--muted)] hover:bg-gray-200"
            title="Cancel"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    );
  }

  if (mode === "reject") {
    return (
      <div className="flex items-center gap-1">
        <input value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Reason…" className="input text-xs py-1 w-32" autoFocus />
        <button onClick={handleReject} disabled={!reason.trim() || loading}
          className="p-1.5 rounded bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50">
          <Check size={12} />
        </button>
        <button onClick={() => setMode(null)}
          className="p-1.5 rounded bg-gray-100 text-[var(--muted)] hover:bg-gray-200">
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </p>
      )}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setMode("approve")}
          disabled={loading}
          className="p-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 text-xs font-medium px-2"
          title="Approve"
        >
          Approve
        </button>
        <button
          onClick={() => setMode("reject")}
          className="p-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium px-2"
          title="Reject"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
