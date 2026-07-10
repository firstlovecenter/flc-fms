import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requirePerm } from "@/lib/auth/guards";
import { getBlockingReceiptExpense } from "@/lib/receipt-policy";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import ExpenseForm from "@/components/expenses/ExpenseForm";

export default async function NewExpensePage() {
  const session = await requirePerm("finance:submit_expense");
  const blocking = await getBlockingReceiptExpense(session.sub);

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Submit Expense Request</h1>
        <p className="text-sm page-subtitle">Facility Managers can approve your request.</p>
      </div>

      {blocking ? (
        <div className="bg-danger/10 border border-danger/25 rounded-xl p-4 flex gap-3">
          <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
          <div className="text-sm text-danger space-y-2">
            <p className="font-semibold">You can&apos;t submit a new expense request yet.</p>
            <p>
              Your approved expense &ldquo;{blocking.title}&rdquo; ({formatCurrency(Number(blocking.amount))}, approved{" "}
              {blocking.approvedAt ? formatDateTime(blocking.approvedAt) : ""}) has been outstanding without a receipt
              for more than 24 hours. Upload its receipt before you can submit another request.
            </p>
            <Link href={`/transactions/expenses/${blocking.id}/edit`} className="inline-block font-medium underline">
              Upload receipt now →
            </Link>
          </div>
        </div>
      ) : (
        <ExpenseForm />
      )}
    </div>
  );
}
