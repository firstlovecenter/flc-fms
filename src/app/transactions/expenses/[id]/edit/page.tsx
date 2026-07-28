import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { isExpenseLocked } from "@/lib/transaction-lock";
import ExpenseEditForm from "@/components/expenses/ExpenseEditForm";

export default async function EditExpensePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await requirePerm(["finance:view", "finance:submit_expense"]);

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
      spentAt: true,
    },
  });

  if (!expense) notFound();

  const canManage = session.role === "SUPER_ADMIN" || (session.authContext?.permissions["finance:approve_expense"] ?? false);
  const requesterReceiptOnly = expense.status === "APPROVED" && expense.createdById === session.sub;

  if (!canManage && !requesterReceiptOnly) {
    notFound();
  }

  // A locked transaction can no longer be edited, but its receipt can still be
  // uploaded or replaced — so it falls back to the receipt-only form.
  const isLocked = isExpenseLocked(expense.createdAt, expense.status);
  const receiptOnly = requesterReceiptOnly || isLocked;

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">{receiptOnly ? "Upload Expense Receipt" : "Edit Expense"}</h1>
        <p className="text-sm page-subtitle">
          {isLocked
            ? "Only the receipt can be changed on this transaction."
            : receiptOnly
              ? "This expense is approved. You can only upload or replace the receipt file."
              : "Update the selected expense record."}
        </p>
      </div>
      {isLocked && (
        <p className="text-sm text-danger bg-danger/10 border border-danger/25 rounded-lg p-3">
          This transaction is locked because it is older than one week. Its details can no longer be
          changed, but you can still upload or replace its receipt.
        </p>
      )}
      <ExpenseEditForm
        receiptOnly={receiptOnly}
        allowRemoveReceipt={!isLocked}
        expense={{
          ...expense,
          amount: Number(expense.amount),
          receiptUrl: expense.receiptUrl ?? undefined,
        }}
      />
    </div>
  );
}
