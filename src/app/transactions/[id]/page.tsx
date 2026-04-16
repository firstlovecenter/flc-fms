import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, User, DollarSign, Clock, Zap } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { isTransactionLocked } from "@/lib/transaction-lock";
import { formatCurrency, formatDateTime, statusBadgeClass } from "@/lib/utils";
import ExpenseActions from "@/components/expenses/ExpenseActions";

export default async function ExpenseDetailPage({ params }: { params: { id: string } }) {
  const session = await requireStaff();

  const expense = await prisma.expense.findFirst({
    where: { id: params.id },
    include: {
      createdBy:    { select: { name: true, email: true, role: true } },
      approvedBy:   { select: { name: true } },
      chargeExpense: { select: { id: true, amount: true, title: true, status: true } },
    },
  });

  if (!expense) notFound();
  if (["VICAR", "BOOKING_MANAGER"].includes(session.role) && expense.createdById !== session.sub) notFound();

  const canManage = ["FACILITY_MANAGER", "SUPER_ADMIN"].includes(session.role);
  const canUploadReceiptOnly = expense.status === "APPROVED" && expense.createdById === session.sub;
  const isPending = expense.status === "PENDING";
  const isLocked = isTransactionLocked(expense.createdAt);

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="flex items-start sm:items-center gap-3 flex-wrap">
        <Link href="/transactions?tab=expenses" className="p-2 rounded-lg hover:bg-gray-100 text-[var(--muted)]">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{expense.title}</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">#{expense.id.slice(-8).toUpperCase()}</p>
        </div>
        <span className={statusBadgeClass(expense.status)}>{expense.status}</span>
      </div>

      {expense.isTransactionCharge && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-violet-700 text-sm font-semibold mb-1">
            <Zap size={14} /> System-Generated Transaction Charge
          </div>
          <p className="text-sm text-violet-600">
            This entry was automatically created when an expense was approved. It cannot be manually edited or deleted.
          </p>
        </div>
      )}

      {expense.status === "REJECTED" && expense.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Rejection Reason</p>
          <p className="text-sm text-red-600">{expense.rejectionReason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-4 col-span-2">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-medium mb-2">
            <DollarSign size={13} /> Amount
          </div>
          <p className="text-3xl font-bold text-[var(--navy)]">{formatCurrency(Number(expense.amount))}</p>
          <p className="text-sm page-subtitle">{expense.category}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-medium mb-1">
            <User size={13} /> Submitted By
          </div>
          <p className="text-sm font-semibold text-gray-800">{expense.createdBy.name}</p>
          <p className="text-xs text-[var(--muted)]">{expense.createdBy.email}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-medium mb-1">
            <Clock size={13} /> Submitted
          </div>
          <p className="text-sm font-semibold text-gray-800">{formatDateTime(expense.createdAt)}</p>
          {expense.approvedBy && (
            <p className="text-xs text-[var(--muted)] mt-1">Approved by {expense.approvedBy.name}</p>
          )}
        </div>
      </div>

      {expense.narration && (
        <div className="card p-5">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-medium mb-2">
            <FileText size={13} /> Description
          </div>
          <p className="text-gray-800 whitespace-pre-wrap text-sm">{expense.narration}</p>
        </div>
      )}

      {expense.receiptUrl && (
        <div className="card p-5">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-medium mb-2">
            <FileText size={13} /> Receipt
          </div>
          <a
            href={expense.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-[var(--navy)] hover:underline"
          >
            View attached receipt
          </a>
        </div>
      )}

      {expense.chargeExpense && (
        <div className="card p-4 border-violet-200 bg-violet-50">
          <div className="flex items-center gap-2 text-violet-700 text-xs font-medium mb-2">
            <Zap size={13} /> Transaction Charge Applied
          </div>
          <p className="text-sm font-semibold text-violet-800">
            {formatCurrency(Number(expense.chargeExpense.amount))} processing fee
          </p>
          <Link href={`/transactions/${expense.chargeExpense.id}`}
            className="text-xs text-violet-700 hover:underline mt-1 block">
            View charge record →
          </Link>
        </div>
      )}

      {!expense.isTransactionCharge && (canManage || canUploadReceiptOnly) && (
        <div className="flex">
          <Link
            href={`/transactions/expenses/${expense.id}/edit`}
            className="btn-secondary"
          >
            {canUploadReceiptOnly && !canManage ? "Upload / Update Receipt" : "Edit Expense"}
          </Link>
        </div>
      )}

      {canManage && isPending && (
        <div className="card p-6">
          <h2 className="font-semibold text-[var(--navy)] mb-4">Review Expense</h2>
          <ExpenseActions expenseId={expense.id} isLocked={isLocked} />
        </div>
      )}
    </div>
  );
}
