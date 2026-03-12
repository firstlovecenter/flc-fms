import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, User, DollarSign, Clock } from "lucide-react";
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
      createdBy: { select: { name: true, email: true, role: true } },
      approvedBy: { select: { name: true } },
    },
  });

  if (!expense) notFound();
  if (session.role === "VICAR" && expense.createdById !== session.sub) notFound();

  const canManage = ["FACILITY_MANAGER", "SUPER_ADMIN"].includes(session.role);
  const isPending = expense.status === "PENDING";
  const isLocked = isTransactionLocked(expense.createdAt);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/transactions?tab=expenses" className="p-2 rounded-lg hover:bg-gray-100 text-[var(--muted)]">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{expense.title}</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">#{expense.id.slice(-8).toUpperCase()}</p>
        </div>
        <span className={statusBadgeClass(expense.status)}>{expense.status}</span>
      </div>

      {expense.status === "REJECTED" && expense.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Rejection Reason</p>
          <p className="text-sm text-red-600">{expense.rejectionReason}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
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

      {canManage && isPending && (
        <div className="card p-6">
          <h2 className="font-semibold text-[var(--navy)] mb-4">Review Expense</h2>
          <ExpenseActions expenseId={expense.id} isLocked={isLocked} />
        </div>
      )}
    </div>
  );
}
