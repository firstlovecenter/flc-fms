import Link from "next/link";
import { ArrowUpRight, ArrowDownLeft, Wrench, Zap, PiggyBank, Wallet } from "lucide-react";
import { requirePerm } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTotalIncomeIncludingBookingRevenue, getSavingsStatement, getAllAccountBalances } from "@/lib/finance";
import { isReceiptOverdue } from "@/lib/receipt-policy";
import { isExpenseLocked, isTransactionLocked } from "@/lib/transaction-lock";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import PageHeader from "@/components/layout/PageHeader";
import { hasPermission } from "@/lib/permissions";
import ExpenseActions from "@/components/expenses/ExpenseActions";
import IncomeRowActions from "@/components/expenses/IncomeRowActions";
import ExpenseRowActions from "@/components/expenses/ExpenseRowActions";

import { Card } from "@/components/ui/card";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { tab?: string; status?: string; page?: string; sType?: string; sFrom?: string; sTo?: string };
}) {
  const session = await requirePerm(["finance:view", "finance:submit_expense"]);
  const perms = session.authContext?.permissions;
  const canApproveExpenses = session.role === "SUPER_ADMIN" || (perms?.["finance:approve_expense"] ?? false);
  const canRecordIncome = session.role === "SUPER_ADMIN" || (perms?.["finance:record_income"] ?? false);
  const canSavings = session.role === "SUPER_ADMIN" || (perms?.["finance:savings"] ?? false);
  const canManageAccounts = session.role === "SUPER_ADMIN" || (perms?.["finance:manage_accounts"] ?? false);
  const canSubmitExpenses =
    session.role === "SUPER_ADMIN" ||
    (perms ? hasPermission(session.role, session.permissions, "finance:submit_expense") : false);
  const tab = canApproveExpenses ? (searchParams.tab ?? "overview") : "expenses";
  const page = Number(searchParams.page ?? 1);
  const take = 20;

  // Expense filters
  const statusFilter = searchParams.status && searchParams.status !== "ALL"
    ? searchParams.status as "PENDING" | "APPROVED" | "REJECTED" : undefined;

  const expenseWhere = {
    deletedAt: null,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(!canApproveExpenses ? { createdById: session.sub } : {}),
  };

  // Savings statement filters (prefixed to avoid clashing with expense params)
  const sType: "DEPOSIT" | "WITHDRAWAL" | undefined =
    searchParams.sType === "DEPOSIT" || searchParams.sType === "WITHDRAWAL"
      ? searchParams.sType : undefined;
  const sFromDate = searchParams.sFrom ? new Date(searchParams.sFrom) : undefined;
  // Include the whole "to" day
  const sToDate = searchParams.sTo
    ? new Date(new Date(searchParams.sTo).getTime() + 24 * 60 * 60 * 1000 - 1)
    : undefined;
  const savingsFilters = {
    type: sType,
    from: sFromDate && !isNaN(sFromDate.getTime()) ? sFromDate : undefined,
    to:   sToDate   && !isNaN(sToDate.getTime())   ? sToDate   : undefined,
  };
  const hasSavingsFilters = Boolean(savingsFilters.type || savingsFilters.from || savingsFilters.to);
  const savingsExportQuery = new URLSearchParams({
    ...(sType ? { sType } : {}),
    ...(searchParams.sFrom ? { sFrom: searchParams.sFrom } : {}),
    ...(searchParams.sTo ? { sTo: searchParams.sTo } : {}),
  }).toString();

  // Fetch data in parallel
  const [
    expenses, expenseTotal, expenseSummary,
    incomeRecords, incomeTotal, incomeTotals, incomeByCategory,
    savingsStatement, savingsAgg, accountBalances,
  ] = await Promise.all([
    prisma.expense.findMany({
      where: expenseWhere,
      include: {
        createdBy:  { select: { name: true, role: true } },
        approvedBy: { select: { name: true } },
        maintenanceRequest: { select: { id: true, title: true } },
        chargeExpense: { select: { id: true, amount: true } },
        account: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.expense.count({ where: expenseWhere }),
    prisma.expense.groupBy({
      where: expenseWhere,
      by: ["status"],
      _sum: { amount: true },
      _count: true,
    }),
    canApproveExpenses ? prisma.income.findMany({
      where: { deletedAt: null },
      include: {
        recordedBy: { select: { name: true } },
        account:    { select: { name: true } },
      },
      orderBy: { receivedAt: "desc" },
      // Only the income tab pages through history; the overview just needs the latest few
      skip: tab === "income" ? (page - 1) * take : 0,
      take,
    }) : Promise.resolve([]),
    canApproveExpenses ? prisma.income.count({ where: { deletedAt: null } }) : Promise.resolve(0),
    canApproveExpenses
      ? getTotalIncomeIncludingBookingRevenue()
      : Promise.resolve({ recordedIncome: 0, paidBookingRevenue: 0, totalIncome: 0 }),
    canApproveExpenses ? prisma.income.groupBy({
      by: ["category"],
      where: { deletedAt: null },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
    }) : Promise.resolve([]),
    canSavings && tab === "savings"
      ? getSavingsStatement(savingsFilters)
      : Promise.resolve(null),
    canApproveExpenses ? prisma.savingsTransaction.groupBy({
      by: ["type"],
      _sum: { amount: true },
    }) : Promise.resolve([]),
    canApproveExpenses ? getAllAccountBalances() : Promise.resolve([]),
  ]);

  const incomeByCategryList = incomeByCategory.map((c) => ({
    category: c.category,
    _sum: { amount: Number(c._sum.amount ?? 0) },
    _count: c._count,
  })).sort((a, b) => Number(b._sum.amount ?? 0) - Number(a._sum.amount ?? 0));

  const expensePages = Math.ceil(expenseTotal / take);
  const incomePages = Math.ceil(incomeTotal / take);
  const pendingExp = expenseSummary.find((s) => s.status === "PENDING");
  const approvedExp = expenseSummary.find((s) => s.status === "APPROVED");
  const totalIncome = incomeTotals.totalIncome;
  const totalApprovedExpenses = Number(approvedExp?._sum.amount ?? 0);

  // Savings balance
  const savingsDeposits    = Number(savingsAgg.find((r) => r.type === "DEPOSIT")?._sum.amount    ?? 0);
  const savingsWithdrawals = Number(savingsAgg.find((r) => r.type === "WITHDRAWAL")?._sum.amount ?? 0);
  const netSavings         = savingsDeposits - savingsWithdrawals;
  const availableBalance   = totalIncome - totalApprovedExpenses - netSavings;

  // Build tab link helper
  const tabHref = (t: string) => `/transactions?tab=${t}`;
  const tabs = canApproveExpenses
    ? [
        { key: "overview",  label: "Overview" },
        { key: "income",    label: "Income" },
        { key: "expenses",  label: "Expenses" },
        { key: "savings",   label: "Savings" },
      ]
    : [{ key: "expenses", label: "My Expense Requests" }];

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="absolute top-[-100px] right-[-80px] w-[350px] h-[350px] rounded-full pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)" }} />

      {/* Header */}
      <PageHeader
        variant="hero"
        eyebrow="Financial Management"
        title="Transactions"
        description={
          canApproveExpenses ? (
            <>
              Available Balance: <strong className={availableBalance >= 0 ? "text-success" : "text-danger"}>{formatCurrency(availableBalance)}</strong>
            </>
          ) : undefined
        }
        className="relative z-10"
        actions={
          <>
            {canApproveExpenses && (
              <Link href="/transactions/new-income" className={cn(buttonVariants({ variant: "gold" }), "gap-2 justify-center w-full sm:w-auto")}>
                <ArrowDownLeft size={16} /> Record Income
              </Link>
            )}
            {canSubmitExpenses && (
              <Link href="/transactions/new-expense" className={cn(buttonVariants({ variant: "gold" }), "gap-2 justify-center w-full sm:w-auto")}>
                <ArrowUpRight size={16} /> {canApproveExpenses ? "New Expense" : "Request Expense"}
              </Link>
            )}
            {canApproveExpenses && (
              <Link href="/transactions/savings/deposit" className={cn(buttonVariants({ variant: "outline" }), "gap-2 justify-center w-full sm:w-auto")}>
                <PiggyBank size={16} /> Transfer to Savings
              </Link>
            )}
            {canManageAccounts && (
              <Link href="/transactions/accounts" className={cn(buttonVariants({ variant: "outline" }), "gap-2 justify-center w-full sm:w-auto")}>
                <Wallet size={16} /> Manage Accounts
              </Link>
            )}
          </>
        }
      />

      {/* FM Balance Cards */}
      {canApproveExpenses && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="p-4 border-success/25 bg-success/10">
            <p className="text-xs font-medium text-success">Total Income</p>
            <p className="text-2xl font-bold text-success tabular-nums">{formatCurrency(totalIncome)}</p>
          </Card>
          <Card className="p-4 border-info/25 bg-info/10">
            <p className="text-xs font-medium text-info">Approved Expenses</p>
            <p className="text-2xl font-bold text-info tabular-nums">{formatCurrency(totalApprovedExpenses)}</p>
          </Card>
          <Card className="p-4 border-warning/25 bg-warning/10">
            <p className="text-xs font-medium text-warning">Pending Expenses</p>
            <p className="text-2xl font-bold text-warning tabular-nums">{pendingExp?._count ?? 0}</p>
            <p className="text-xs text-warning mt-0.5 tabular-nums">{formatCurrency(Number(pendingExp?._sum.amount ?? 0))}</p>
          </Card>
          <Card className="p-4 border-inventory/25 bg-inventory/10">
            <p className="text-xs font-medium text-inventory">Savings Balance</p>
            <p className="text-2xl font-bold text-inventory tabular-nums">{formatCurrency(netSavings)}</p>
          </Card>
          <Card className={`p-4 ${availableBalance >= 0 ? "border-success/25 bg-success/10" : "border-danger/25 bg-danger/10"}`}>
            <p className={`text-xs font-medium ${availableBalance >= 0 ? "text-success" : "text-danger"}`}>Available Balance</p>
            <p className={`text-2xl font-bold tabular-nums ${availableBalance >= 0 ? "text-success" : "text-danger"}`}>{formatCurrency(availableBalance)}</p>
          </Card>
        </div>
      )}

      {/* Per-Account Balances */}
      {canApproveExpenses && accountBalances.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--cream)] flex justify-between items-center">
            <h3 className="font-semibold text-[var(--navy)] text-sm">Account Balances</h3>
            {canManageAccounts && (
              <Link href="/transactions/accounts" className="text-xs text-[var(--navy)] hover:underline">Manage →</Link>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {accountBalances.map((a) => (
              <div key={a.id} className="p-3 rounded-lg border border-[var(--border)]">
                <p className="text-xs font-medium text-[var(--muted)] truncate" title={a.name}>{a.name}</p>
                <p className={`text-lg font-bold tabular-nums ${a.balance >= 0 ? "text-success" : "text-danger"}`}>
                  {formatCurrency(a.balance)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <Link key={t.key} href={tabHref(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              tab === t.key
                ? "bg-[var(--navy)] text-white border-gold"
                : "bg-white text-[var(--slate)] border-[var(--border)] hover:bg-[var(--cream)]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* ── OVERVIEW TAB (FM only) ─────────────────────────────────── */}
      {tab === "overview" && canApproveExpenses && (
        <>
          {/* Recent Income */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-success/10 flex justify-between items-center">
              <h3 className="font-semibold text-success text-sm">Recent Income</h3>
              <Link href={tabHref("income")} className="text-xs text-success hover:underline">View all →</Link>
            </div>
            {incomeRecords.length === 0 ? (
              <div className="p-8 text-center text-[var(--muted)]">No income recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <tbody>
                    {incomeRecords.slice(0, 5).map((r) => (
                      <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                        <td className="py-2.5 px-4">
                          <p className="font-medium text-[var(--navy)]">{r.title}</p>
                          <p className="text-xs text-[var(--muted)]">{r.category}{r.source ? ` · ${r.source}` : ""}</p>
                        </td>
                        <td className="py-2.5 px-4 text-[var(--muted)] text-xs">{formatDate(r.receivedAt)}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-success tabular-nums">{formatCurrency(Number(r.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Recent Expenses */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-maintenance/10 flex justify-between items-center">
              <h3 className="font-semibold text-maintenance text-sm">Recent Expenses</h3>
              <Link href={tabHref("expenses")} className="text-xs text-maintenance hover:underline">View all →</Link>
            </div>
            {expenses.length === 0 ? (
              <div className="p-8 text-center text-[var(--muted)]">No expenses yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <tbody>
                    {expenses.slice(0, 5).map((e) => (
                      <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                        <td className="py-2.5 px-4">
                          <p className="font-medium text-[var(--navy)]">{e.title}</p>
                          <p className="text-xs text-[var(--muted)]">{e.category} · {e.createdBy.name}</p>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={e.status} size="xs" />
                            {e.status === "APPROVED" && !e.receiptUrl && !e.isTransactionCharge && (
                              <StatusBadge
                                status="UNPAID"
                                label={isReceiptOverdue(e.approvedAt) ? "Receipt Overdue" : "Receipt Missing"}
                                size="xs"
                              />
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold tabular-nums">{formatCurrency(Number(e.amount))}</td>
                        <td className="py-2.5 px-4">
                          {e.status === "PENDING" && <ExpenseActions expenseId={e.id} isLocked={false} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ── INCOME TAB (FM only) ───────────────────────────────────── */}
      {tab === "income" && canApproveExpenses && (
        <>
          {incomeByCategryList.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {incomeByCategryList.map((c) => (
                <Card key={c.category} className="p-4 bg-success/10 border-success/25">
                  <p className="text-xs font-medium text-success truncate">{c.category}</p>
                  <p className="text-xl font-bold text-success tabular-nums">{formatCurrency(Number(c._sum.amount ?? 0))}</p>
                  <p className="text-xs text-success mt-0.5">{c._count} record{c._count !== 1 ? "s" : ""}</p>
                </Card>
              ))}
            </div>
          )}

          <Card className="overflow-hidden">
            {incomeRecords.length === 0 ? (
              <div className="p-12 text-center text-[var(--muted)]">No income records yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="bg-[var(--cream)] border-b border-[var(--border)]">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Title</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Category</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Source</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Recorded By</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Date</th>
                      <th className="text-right py-3 px-4 font-medium text-[var(--slate)]">Amount</th>
                      <th className="text-right py-3 px-4 font-medium text-[var(--slate)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeRecords.map((r) => (
                      <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                        <td className="py-3 px-4">
                          <p className="font-medium">{r.title}</p>
                          <p className="text-xs text-[var(--muted)] line-clamp-1">{r.narration}</p>
                        </td>
                        <td className="py-3 px-4 text-[var(--slate)]">
                          {r.category}
                          {r.account && <p className="text-xs text-[var(--muted)]">Into {r.account.name}</p>}
                        </td>
                        <td className="py-3 px-4 text-[var(--muted)]">{r.source ?? "—"}</td>
                        <td className="py-3 px-4 text-[var(--slate)]">{r.recordedBy?.name ?? "System"}</td>
                        <td className="py-3 px-4 text-[var(--slate)]">{formatDate(r.receivedAt)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-success tabular-nums">{formatCurrency(Number(r.amount))}</td>
                        <td className="py-3 px-4 text-right">
                          <IncomeRowActions incomeId={r.id} isLocked={isTransactionLocked(r.createdAt)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {incomePages > 1 && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-xs text-[var(--muted)] mr-auto">Page {page} of {incomePages}</span>
              {page > 1 && <Link href={`/transactions?tab=income&page=${page - 1}`} className={cn(buttonVariants({ variant: "outline" }))}>Previous</Link>}
              {page < incomePages && <Link href={`/transactions?tab=income&page=${page + 1}`} className={cn(buttonVariants({ variant: "default" }))}>Next</Link>}
            </div>
          )}
        </>
      )}

      {/* ── EXPENSES TAB ───────────────────────────────────────────── */}
      {tab === "expenses" && (
        <>
          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            {["ALL", "PENDING", "APPROVED", "REJECTED"].map((s) => (
              <Link key={s} href={`/transactions?tab=expenses&status=${s}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  (searchParams.status ?? "ALL") === s
                    ? "bg-[var(--navy)] text-white border-brand-500"
                    : "bg-white text-[var(--slate)] border-[var(--border)] hover:bg-[var(--cream)]"
                }`}
              >
                {s}
              </Link>
            ))}
          </div>

          <Card className="overflow-hidden">
            {expenses.length === 0 ? (
              <div className="p-12 text-center text-[var(--muted)]">No expenses found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="bg-[var(--cream)] border-b border-[var(--border)]">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Title</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Category</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Submitted By</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Date</th>
                      <th className="text-right py-3 px-4 font-medium text-[var(--slate)]">Amount</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">{canApproveExpenses ? "Actions" : ""}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-[var(--navy)]">{e.title}</p>
                            {e.maintenanceRequest && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6rem] font-semibold bg-maintenance/10 text-maintenance border border-maintenance/25">
                                <Wrench size={9} /> Maintenance
                              </span>
                            )}
                            {e.isTransactionCharge && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6rem] font-semibold bg-inventory/10 text-inventory border border-inventory/25">
                                <Zap size={9} /> Charge
                              </span>
                            )}
                            {!e.isTransactionCharge && e.chargeExpense && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6rem] font-semibold bg-inventory/10 text-inventory border border-inventory/25">
                                <Zap size={9} /> +{formatCurrency(Number(e.chargeExpense.amount))} charge
                              </span>
                            )}
                          </div>
                          {e.maintenanceRequest ? (
                            <Link href={`/maintenance/${e.maintenanceRequest.id}`} className="text-xs text-[var(--gold)] hover:underline mt-0.5 block">
                              ↩ {e.maintenanceRequest.title}
                            </Link>
                          ) : (
                            <p className="text-xs text-[var(--muted)] line-clamp-1 mt-0.5">{e.narration}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[var(--slate)]">
                          {e.category}
                          {e.account && <p className="text-xs text-[var(--muted)]">Paid via {e.account.name}</p>}
                        </td>
                        <td className="py-3 px-4 text-[var(--slate)]">
                          {e.createdBy.name}
                          <p className="text-xs text-[var(--muted)]">{e.createdBy.role}</p>
                        </td>
                        <td className="py-3 px-4 text-[var(--slate)]">{formatDate(e.spentAt ?? e.createdAt)}</td>
                        <td className="py-3 px-4 text-right font-semibold tabular-nums">{formatCurrency(Number(e.amount))}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={e.status} size="xs" />
                            {e.status === "APPROVED" && !e.receiptUrl && !e.isTransactionCharge && (
                              <StatusBadge
                                status="UNPAID"
                                label={isReceiptOverdue(e.approvedAt) ? "Receipt Overdue" : "Receipt Missing"}
                                size="xs"
                              />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link href={`/transactions/${e.id}`} className="text-xs text-[var(--navy)] hover:underline">View</Link>
                            {e.status === "APPROVED" && e.createdById === session.sub && !canApproveExpenses && !e.isTransactionCharge && (
                              <Link href={`/transactions/expenses/${e.id}/edit`} className="text-xs text-[var(--navy)] hover:underline">
                                Upload Receipt
                              </Link>
                            )}
                            {canApproveExpenses && !e.isTransactionCharge && <ExpenseRowActions expenseId={e.id} isLocked={isExpenseLocked(e.createdAt, e.status)} />}
                            {canApproveExpenses && e.status === "PENDING" && !e.isTransactionCharge && <ExpenseActions expenseId={e.id} isLocked={false} />}
                            {e.approvedBy && (
                              <span className="text-xs text-[var(--muted)]">by {e.approvedBy.name}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {expensePages > 1 && (
            <div className="flex flex-wrap justify-end gap-2">
              {page > 1 && <Link href={`/transactions?tab=expenses&status=${searchParams.status ?? "ALL"}&page=${page - 1}`} className={cn(buttonVariants({ variant: "outline" }))}>Previous</Link>}
              {page < expensePages && <Link href={`/transactions?tab=expenses&status=${searchParams.status ?? "ALL"}&page=${page + 1}`} className={cn(buttonVariants({ variant: "default" }))}>Next</Link>}
            </div>
          )}
        </>
      )}

      {/* ── SAVINGS TAB (FM only) ──────────────────────────────────── */}
      {tab === "savings" && canSavings && (
        <>
          {/* Savings summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 border-success/25 bg-success/10">
              <p className="text-xs font-medium text-success">Total Transferred In</p>
              <p className="text-2xl font-bold text-success tabular-nums">{formatCurrency(savingsDeposits)}</p>
            </Card>
            <Card className="p-4 border-maintenance/25 bg-maintenance/10">
              <p className="text-xs font-medium text-maintenance">Total Transferred Out</p>
              <p className="text-2xl font-bold text-maintenance tabular-nums">{formatCurrency(savingsWithdrawals)}</p>
            </Card>
            <Card className="p-4 border-inventory/25 bg-inventory/10">
              <p className="text-xs font-medium text-inventory">Savings Balance</p>
              <p className="text-2xl font-bold text-inventory tabular-nums">{formatCurrency(netSavings)}</p>
            </Card>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Link href="/transactions/savings/deposit" className={cn(buttonVariants({ variant: "gold" }), "gap-2")}>
              <PiggyBank size={16} /> Transfer to Savings
            </Link>
            <Link href="/transactions/savings/withdrawal" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
              <ArrowUpRight size={16} /> Transfer to Operating
            </Link>
            <a
              href={`/api/savings/export${savingsExportQuery ? `?${savingsExportQuery}` : ""}`}
              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
              download
            >
              <ArrowDownLeft size={16} /> Export CSV
            </a>
          </div>

          {/* Statement filters */}
          <form action="/transactions" method="get" ><Card className="p-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="tab" value="savings" />
            <div>
              <Label htmlFor="savings-stype" className="text-xs text-[var(--slate)] mb-1">Type</Label>
              <NativeSelect id="savings-stype" name="sType" defaultValue={sType ?? ""} className="w-full text-sm">
                <option value="">All</option>
                <option value="DEPOSIT">Transfers In</option>
                <option value="WITHDRAWAL">Transfers Out</option>
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="savings-sfrom" className="text-xs text-[var(--slate)] mb-1">From</Label>
              <Input id="savings-sfrom" type="date" name="sFrom" defaultValue={searchParams.sFrom ?? ""} className="text-sm" />
            </div>
            <div>
              <Label htmlFor="savings-sto" className="text-xs text-[var(--slate)] mb-1">To</Label>
              <Input id="savings-sto" type="date" name="sTo" defaultValue={searchParams.sTo ?? ""} className="text-sm" />
            </div>
            <Button type="submit">Apply</Button>
            {hasSavingsFilters && (
              <Link href="/transactions?tab=savings" className={cn(buttonVariants({ variant: "outline" }))}>
                Clear
              </Link>
            )}
          </Card></form>

          {/* Savings statement */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-inventory/10 flex items-center justify-between">
              <h3 className="font-semibold text-inventory text-sm">Savings Account Statement</h3>
              {hasSavingsFilters && (
                <span className="text-xs text-inventory">Filtered — balances reflect full history</span>
              )}
            </div>
            {!savingsStatement || savingsStatement.rows.length === 0 ? (
              <div className="p-12 text-center text-[var(--muted)]">
                {hasSavingsFilters ? "No savings transactions match these filters." : "No savings transactions yet."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-[var(--cream)] border-b border-[var(--border)]">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Narration</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">By</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Date</th>
                      <th className="text-right py-3 px-4 font-medium text-[var(--slate)]">Amount</th>
                      <th className="text-right py-3 px-4 font-medium text-[var(--slate)]">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savingsStatement.rows.map((s) => (
                      <tr key={s.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            s.type === "DEPOSIT"
                              ? "bg-success/10 text-success border border-success/25"
                              : "bg-maintenance/10 text-maintenance border border-maintenance/25"
                          }`}>
                            {s.type === "DEPOSIT" ? "Transfer In" : "Transfer Out"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--slate)]">
                          {s.narration}
                          {s.accountName && (
                            <p className="text-xs text-[var(--muted)] mt-0.5">
                              {s.type === "DEPOSIT" ? `From ${s.accountName}` : `Into ${s.accountName}`}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[var(--slate)]">{s.createdByName}</td>
                        <td className="py-3 px-4 text-[var(--slate)]">{formatDate(s.createdAt)}</td>
                        <td className={`py-3 px-4 text-right font-semibold tabular-nums ${s.type === "DEPOSIT" ? "text-success" : "text-maintenance"}`}>
                          {s.type === "DEPOSIT" ? "+" : "−"}{formatCurrency(s.amount)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-inventory tabular-nums">
                          {formatCurrency(s.balanceAfter)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
