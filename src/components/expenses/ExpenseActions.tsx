"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { approveExpense, rejectExpense } from "@/actions/expense.actions";

export default function ExpenseActions({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "reject">(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setLoading(true);
    setError(null);
    const result = await approveExpense(expenseId);
    if (result && "error" in result) {
      setError(result.error as string);
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  async function handleReject() {
    if (!reason.trim()) return;
    setLoading(true);
    setError(null);
    await rejectExpense(expenseId, reason);
    router.refresh();
    setLoading(false);
    setMode(null);
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
        <button onClick={handleApprove} disabled={loading}
          className="p-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 text-xs font-medium px-2"
          title="Approve">
          Approve
        </button>
        <button onClick={() => setMode("reject")}
          className="p-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200 text-xs font-medium px-2"
          title="Reject">
          Reject
        </button>
      </div>
    </div>
  );
}
