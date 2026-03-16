import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { isTransactionLocked } from "@/lib/transaction-lock";
import ExpenseEditForm from "@/components/expenses/ExpenseEditForm";

export default async function EditExpensePage({ params }: { params: { id: string } }) {
  const session = await requireStaff();

  const expense = await prisma.expense.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      narration: true,
      amount: true,
      category: true,
      status: true,
      createdById: true,
      receiptUrl: true,
      createdAt: true,
    },
  });

  if (!expense) notFound();

  const canManage = ["FACILITY_MANAGER", "SUPER_ADMIN"].includes(session.role);
  const requesterReceiptOnly = expense.status === "APPROVED" && expense.createdById === session.sub;

  if (!canManage && !requesterReceiptOnly) {
    notFound();
  }

  if (isTransactionLocked(expense.createdAt) && !requesterReceiptOnly) {
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
        <h1 className="page-title">{requesterReceiptOnly ? "Upload Expense Receipt" : "Edit Expense"}</h1>
        <p className="text-sm page-subtitle">
          {requesterReceiptOnly
            ? "This expense is approved. You can only upload or replace the receipt file."
            : "Update the selected expense record."}
        </p>
      </div>
      <ExpenseEditForm
        receiptOnly={requesterReceiptOnly}
        expense={{
          ...expense,
          amount: Number(expense.amount),
          receiptUrl: expense.receiptUrl ?? undefined,
        }}
      />
    </div>
  );
}
