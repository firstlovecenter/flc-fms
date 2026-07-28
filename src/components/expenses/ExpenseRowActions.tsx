"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteExpense } from "@/actions/expense.actions";

export default function ExpenseRowActions({
  expenseId,
  isLocked,
}: {
  expenseId: string;
  isLocked: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Locked transactions can't be edited or deleted, but their receipt stays uploadable.
  if (isLocked) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-[var(--muted)]">Locked</span>
        <Link href={`/transactions/expenses/${expenseId}/edit`} className="text-xs text-[var(--navy)] hover:underline">
          Receipt
        </Link>
      </div>
    );
  }

  async function handleDelete() {
    const ok = window.confirm("Delete this expense record?");
    if (!ok) return;

    setLoading(true);
    setError(null);
    const result = await deleteExpense(expenseId);
    if (result && "error" in result && result.error) {
      setError(result.error as string);
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-1">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <div className="flex items-center gap-2">
        <Link href={`/transactions/expenses/${expenseId}/edit`} className="text-xs text-[var(--navy)] hover:underline">
          Edit
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="text-xs text-red-700 hover:underline disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
