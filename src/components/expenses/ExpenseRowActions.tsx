"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteExpense } from "@/actions/expense.actions";

export default function ExpenseRowActions({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const ok = window.confirm("Delete this expense record?");
    if (!ok) return;

    setLoading(true);
    await deleteExpense(expenseId);
    router.refresh();
    setLoading(false);
  }

  return (
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
  );
}
