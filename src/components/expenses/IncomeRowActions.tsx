"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteIncome } from "@/actions/income.actions";

export default function IncomeRowActions({ incomeId }: { incomeId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const ok = window.confirm("Delete this income record?");
    if (!ok) return;

    setLoading(true);
    await deleteIncome(incomeId);
    router.refresh();
    setLoading(false);
  }

  return (
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
  );
}
