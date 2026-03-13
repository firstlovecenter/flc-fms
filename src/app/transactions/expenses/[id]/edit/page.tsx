import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { isTransactionLocked } from "@/lib/transaction-lock";
import ExpenseEditForm from "@/components/expenses/ExpenseEditForm";

export default async function EditExpensePage({ params }: { params: { id: string } }) {
  await requireStaff("FACILITY_MANAGER");

  const expense = await prisma.expense.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      narration: true,
      amount: true,
      category: true,
      createdAt: true,
    },
  });

  if (!expense) notFound();

  if (isTransactionLocked(expense.createdAt)) {
    return (
      <div className="w-full max-w-2xl space-y-4">
        <h1 className="page-title">Edit Expense</h1>
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          This transaction is locked because it is older than one week.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Edit Expense</h1>
        <p className="text-sm page-subtitle">Update the selected expense record.</p>
      </div>
      <ExpenseEditForm
        expense={{
          ...expense,
          amount: Number(expense.amount),
        }}
      />
    </div>
  );
}
