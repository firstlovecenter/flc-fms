"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteIncome } from "@/actions/income.actions";

export default function IncomeRowActions({
  incomeId,
  isLocked,
}: {
  incomeId: string;
  isLocked: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLocked) {
    return <span className="text-xs text-[var(--muted)]">Locked</span>;
  }

  async function handleDelete() {
    const ok = window.confirm("Delete this income record?");
    if (!ok) return;

    setLoading(true);
    setError(null);
    const result = await deleteIncome(incomeId);
    if (result && "error" in result && result.error) {
      setError(result.error as string);
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <div className="flex items-center gap-2 justify-end">
        <Link href={`/transactions/income/${incomeId}/edit`} className="text-xs text-[var(--navy)] hover:underline">
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
