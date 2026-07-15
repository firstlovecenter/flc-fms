import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, User, DollarSign, Clock, Zap } from "lucide-react";
import { requirePerm } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { isExpenseLocked } from "@/lib/transaction-lock";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { buttonVariants } from "@/components/ui/button-variants";
import ExpenseActions from "@/components/expenses/ExpenseActions";

import { Card } from "@/components/ui/card";

export default async function ExpenseDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await requirePerm(["finance:view", "finance:submit_expense"]);

  const expense = await prisma.expense.findFirst({
    where: { id: params.id },
    include: {
      createdBy:    { select: { name: true, email: true, role: true } },
      approvedBy:   { select: { name: true } },
      chargeExpense: { select: { id: true, amount: true, title: true, status: true } },
      account:      { select: { name: true } },
    },
  });

  if (!expense) notFound();

  const canManage = session.role === "SUPER_ADMIN" || (session.authContext?.permissions["finance:approve_expense"] ?? false);
  // Non-approvers (incl. submit-only requesters) may only view their own expenses.
  if (!canManage && expense.createdById !== session.sub) notFound();
  const canUploadReceiptOnly = expense.status === "APPROVED" && expense.createdById === session.sub;
  const isPending = expense.status === "PENDING";
  const isLocked = isExpenseLocked(expense.createdAt, expense.status);

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="flex items-start sm:items-center gap-3 flex-wrap">
        <Link
          href="/transactions?tab=expenses"
          aria-label="Back to transactions"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-[var(--muted)]")}
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{expense.title}</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">#{expense.id.slice(-8).toUpperCase()}</p>
        </div>
        <StatusBadge status={expense.status} size="md" />
      </div>

      {expense.isTransactionCharge && (
        <div className="bg-inventory/10 border border-inventory/25 rounded-xl p-4">
          <div className="flex items-center gap-2 text-inventory text-sm font-semibold mb-1">
            <Zap size={14} /> System-Generated Transaction Charge
          </div>
          <p className="text-sm text-inventory">
            This entry was automatically created when an expense was approved. It cannot be manually edited or deleted.
          </p>
        </div>
      )}

      {expense.status === "REJECTED" && expense.rejectionReason && (
        <div className="bg-danger/10 border border-danger/25 rounded-xl p-4">
          <p className="text-sm font-semibold text-danger mb-1">Rejection Reason</p>
          <p className="text-sm text-danger">{expense.rejectionReason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 col-span-2">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-medium mb-2">
            <DollarSign size={13} /> Amount
          </div>
          <p className="text-3xl font-bold text-[var(--navy)] tabular-nums">{formatCurrency(Number(expense.amount))}</p>
          <p className="text-sm page-subtitle">{expense.category}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-medium mb-1">
            <User size={13} /> Submitted By
          </div>
          <p className="text-sm font-semibold text-gray-800">{expense.createdBy.name}</p>
          <p className="text-xs text-[var(--muted)]">{expense.createdBy.email}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-medium mb-1">
            <Clock size={13} /> Submitted
          </div>
          <p className="text-sm font-semibold text-gray-800">{formatDateTime(expense.createdAt)}</p>
          {expense.approvedBy && (
            <p className="text-xs text-[var(--muted)] mt-1">Approved by {expense.approvedBy.name}</p>
          )}
          {expense.account && (
            <p className="text-xs text-[var(--muted)] mt-1">Paid via {expense.account.name}</p>
          )}
        </Card>
      </div>

      {expense.narration && (
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[var(--muted)] text-xs font-medium mb-2">
            <FileText size={13} /> Description
          </div>
          <p className="text-gray-800 whitespace-pre-wrap text-sm">{expense.narration}</p>
        </Card>
      )}

      {expense.receiptUrl && (
        <Card className="p-5">
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
        </Card>
      )}

      {expense.chargeExpense && (
        <Card className="p-4 border-inventory/25 bg-inventory/10">
          <div className="flex items-center gap-2 text-inventory text-xs font-medium mb-2">
            <Zap size={13} /> Transaction Charge Applied
          </div>
          <p className="text-sm font-semibold text-inventory tabular-nums">
            {formatCurrency(Number(expense.chargeExpense.amount))} processing fee
          </p>
          <Link href={`/transactions/${expense.chargeExpense.id}`}
            className="text-xs text-inventory hover:underline mt-1 block">
            View charge record →
          </Link>
        </Card>
      )}

      {!expense.isTransactionCharge && (canManage || canUploadReceiptOnly) && (
        <div className="flex">
          <Link
            href={`/transactions/expenses/${expense.id}/edit`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {canUploadReceiptOnly && !canManage ? "Upload / Update Receipt" : "Edit Expense"}
          </Link>
        </div>
      )}

      {canManage && isPending && (
        <Card className="p-6">
          <h2 className="font-semibold text-[var(--navy)] mb-4">Review Expense</h2>
          <ExpenseActions expenseId={expense.id} isLocked={isLocked} />
        </Card>
      )}
    </div>
  );
}
