import Link from "next/link";
import { ArrowUpRight, ArrowDownLeft, Wrench, Zap, PiggyBank } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getTotalIncomeIncludingBookingRevenue } from "@/lib/finance";
import { isExpenseLocked, isTransactionLocked } from "@/lib/transaction-lock";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { hasVicarPermission } from "@/lib/staff-permissions";
import ExpenseActions from "@/components/expenses/ExpenseActions";
import IncomeRowActions from "@/components/expenses/IncomeRowActions";
import ExpenseRowActions from "@/components/expenses/ExpenseRowActions";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { tab?: string; status?: string; page?: string };
}) {
  const session = await requireStaff();
  const isFM = ["FACILITY_MANAGER", "SUPER_ADMIN"].includes(session.role);
  const canSubmitExpenses =
    isFM ||
    session.role === "BOOKING_MANAGER" ||
    (session.role === "VICAR" && hasVicarPermission(session.permissions, "canSubmitExpenses"));
  const tab = isFM ? (searchParams.tab ?? "overview") : "expenses";
  const page = Number(searchParams.page ?? 1);
  const take = 20;

  // Expense filters
  const statusFilter = searchParams.status && searchParams.status !== "ALL"
    ? searchParams.status as "PENDING" | "APPROVED" | "REJECTED" : undefined;

  const expenseWhere = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(["VICAR", "BOOKING_MANAGER"].includes(session.role) ? { createdById: session.sub } : {}),
  };

  // Fetch data in parallel
  const [
    expenses, expenseTotal, expenseSummary,
    incomeRecords, incomeTotals, incomeByCategory,
    savingsRecords, savingsAgg,
  ] = await Promise.all([
    prisma.expense.findMany({
      where: expenseWhere,
      include: {
        createdBy:  { select: { name: true, role: true } },
        approvedBy: { select: { name: true } },
        maintenanceRequest: { select: { id: true, title: true } },
        chargeExpense: { select: { id: true, amount: true } },
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
    isFM ? prisma.income.findMany({
      include: { recordedBy: { select: { name: true } } },
      orderBy: { receivedAt: "desc" },
      take: 50,
    }) : Promise.resolve([]),
    isFM
      ? getTotalIncomeIncludingBookingRevenue()
      : Promise.resolve({ recordedIncome: 0, paidBookingRevenue: 0, totalIncome: 0 }),
    isFM ? prisma.income.groupBy({
      by: ["category"],
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
    }) : Promise.resolve([]),
    isFM ? prisma.savingsTransaction.findMany({
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }) : Promise.resolve([]),
    isFM ? prisma.savingsTransaction.groupBy({
      by: ["type"],
      _sum: { amount: true },
    }) : Promise.resolve([]),
  ]);

  const incomeByCategryList = incomeByCategory.map((c) => ({
    category: c.category,
    _sum: { amount: Number(c._sum.amount ?? 0) },
    _count: c._count,
  })).sort((a, b) => Number(b._sum.amount ?? 0) - Number(a._sum.amount ?? 0));

  const expensePages = Math.ceil(expenseTotal / take);
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
  const tabs = isFM
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
      <div className="page-hero flex items-start justify-between gap-4 flex-wrap relative z-10">
        <div>
          <p className="section-eyebrow mb-3">Financial Management</p>
          <h1 className="page-title text-[2rem] mb-2">Transactions</h1>
          {isFM && (
            <p className="page-hero-muted text-[0.95rem]">
              Available Balance: <strong style={{ color: availableBalance >= 0 ? "#86efac" : "#fca5a5" }}>{formatCurrency(availableBalance)}</strong>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto flex-shrink-0 mt-2">
          {isFM && (
            <Link href="/transactions/new-income" className="btn-gold flex items-center justify-center gap-2 w-full sm:w-auto">
              <ArrowDownLeft size={16} /> Record Income
            </Link>
          )}
          {canSubmitExpenses && (
            <Link href="/transactions/new-expense" className="btn-gold flex items-center justify-center gap-2 w-full sm:w-auto">
              <ArrowUpRight size={16} /> {isFM ? "New Expense" : "Request Expense"}
            </Link>
          )}
          {isFM && (
            <Link href="/transactions/savings/deposit" className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto">
              <PiggyBank size={16} /> Move to Savings
            </Link>
          )}
        </div>
      </div>

      {/* FM Balance Cards */}
      {isFM && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="card p-4 border-green-200 bg-green-50">
            <p className="text-xs font-medium text-green-700">Total Income</p>
            <p className="text-2xl font-bold text-green-800">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="card p-4 border-blue-200 bg-blue-50">
            <p className="text-xs font-medium text-blue-700">Approved Expenses</p>
            <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalApprovedExpenses)}</p>
          </div>
          <div className="card p-4 border-yellow-200 bg-yellow-50">
            <p className="text-xs font-medium text-yellow-700">Pending Expenses</p>
            <p className="text-2xl font-bold text-yellow-800">{pendingExp?._count ?? 0}</p>
            <p className="text-xs text-yellow-600 mt-0.5">{formatCurrency(Number(pendingExp?._sum.amount ?? 0))}</p>
          </div>
          <div className="card p-4 border-purple-200 bg-purple-50">
            <p className="text-xs font-medium text-purple-700">Savings Balance</p>
            <p className="text-2xl font-bold text-purple-800">{formatCurrency(netSavings)}</p>
          </div>
          <div className={`card p-4 ${availableBalance >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
            <p className={`text-xs font-medium ${availableBalance >= 0 ? "text-emerald-700" : "text-red-700"}`}>Available Balance</p>
            <p className={`text-2xl font-bold ${availableBalance >= 0 ? "text-emerald-800" : "text-red-800"}`}>{formatCurrency(availableBalance)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <Link key={t.key} href={tabHref(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              tab === t.key
                ? "bg-[var(--navy)] text-white border-brand-500"
                : "bg-white text-[var(--slate)] border-[var(--border)] hover:bg-[var(--cream)]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* ── OVERVIEW TAB (FM only) ─────────────────────────────────── */}
      {tab === "overview" && isFM && (
        <>
          {/* Recent Income */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-green-50 flex justify-between items-center">
              <h3 className="font-semibold text-green-800 text-sm">Recent Income</h3>
              <Link href={tabHref("income")} className="text-xs text-green-700 hover:underline">View all →</Link>
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
                        <td className="py-2.5 px-4 text-right font-semibold text-green-700">{formatCurrency(Number(r.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Expenses */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-orange-50 flex justify-between items-center">
              <h3 className="font-semibold text-orange-800 text-sm">Recent Expenses</h3>
              <Link href={tabHref("expenses")} className="text-xs text-orange-700 hover:underline">View all →</Link>
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
                            {e.status === "APPROVED" && !e.receiptUrl && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                Receipt Missing
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold">{formatCurrency(Number(e.amount))}</td>
                        <td className="py-2.5 px-4">
                          {e.status === "PENDING" && <ExpenseActions expenseId={e.id} isLocked={false} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── INCOME TAB (FM only) ───────────────────────────────────── */}
      {tab === "income" && isFM && (
        <>
          {incomeByCategryList.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {incomeByCategryList.map((c) => (
                <div key={c.category} className="card p-4 bg-green-50 border-green-200">
                  <p className="text-xs font-medium text-green-700 truncate">{c.category}</p>
                  <p className="text-xl font-bold text-green-800">{formatCurrency(Number(c._sum.amount ?? 0))}</p>
                  <p className="text-xs text-green-600 mt-0.5">{c._count} record{c._count !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
          )}

          <div className="card overflow-hidden">
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
                        <td className="py-3 px-4 text-[var(--slate)]">{r.category}</td>
                        <td className="py-3 px-4 text-[var(--muted)]">{r.source ?? "—"}</td>
                        <td className="py-3 px-4 text-[var(--slate)]">{r.recordedBy?.name ?? "System"}</td>
                        <td className="py-3 px-4 text-[var(--slate)]">{formatDate(r.receivedAt)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-green-700">{formatCurrency(Number(r.amount))}</td>
                        <td className="py-3 px-4 text-right">
                          <IncomeRowActions incomeId={r.id} isLocked={isTransactionLocked(r.createdAt)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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

          <div className="card overflow-hidden">
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
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">{isFM ? "Actions" : ""}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-[var(--navy)]">{e.title}</p>
                            {e.maintenanceRequest && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6rem] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                                <Wrench size={9} /> Maintenance
                              </span>
                            )}
                            {e.isTransactionCharge && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6rem] font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                                <Zap size={9} /> Charge
                              </span>
                            )}
                            {!e.isTransactionCharge && e.chargeExpense && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6rem] font-semibold bg-violet-50 text-violet-700 border border-violet-200">
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
                        <td className="py-3 px-4 text-[var(--slate)]">{e.category}</td>
                        <td className="py-3 px-4 text-[var(--slate)]">
                          {e.createdBy.name}
                          <p className="text-xs text-[var(--muted)]">{e.createdBy.role}</p>
                        </td>
                        <td className="py-3 px-4 text-[var(--slate)]">{formatDate(e.createdAt)}</td>
                        <td className="py-3 px-4 text-right font-semibold">{formatCurrency(Number(e.amount))}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={e.status} size="xs" />
                            {e.status === "APPROVED" && !e.receiptUrl && !e.isTransactionCharge && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                Receipt Missing
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link href={`/transactions/${e.id}`} className="text-xs text-[var(--navy)] hover:underline">View</Link>
                            {e.status === "APPROVED" && e.createdById === session.sub && !isFM && !e.isTransactionCharge && (
                              <Link href={`/transactions/expenses/${e.id}/edit`} className="text-xs text-[var(--navy)] hover:underline">
                                Upload Receipt
                              </Link>
                            )}
                            {isFM && !e.isTransactionCharge && <ExpenseRowActions expenseId={e.id} isLocked={isExpenseLocked(e.createdAt, e.status)} />}
                            {isFM && e.status === "PENDING" && !e.isTransactionCharge && <ExpenseActions expenseId={e.id} isLocked={false} />}
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
          </div>

          {expensePages > 1 && (
            <div className="flex flex-wrap justify-end gap-2">
              {page > 1 && <Link href={`/transactions?tab=expenses&status=${searchParams.status ?? "ALL"}&page=${page - 1}`} className="btn-secondary">Previous</Link>}
              {page < expensePages && <Link href={`/transactions?tab=expenses&status=${searchParams.status ?? "ALL"}&page=${page + 1}`} className="btn-primary">Next</Link>}
            </div>
          )}
        </>
      )}

      {/* ── SAVINGS TAB (FM only) ──────────────────────────────────── */}
      {tab === "savings" && isFM && (
        <>
          {/* Savings summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4 border-green-200 bg-green-50">
              <p className="text-xs font-medium text-green-700">Total Deposited</p>
              <p className="text-2xl font-bold text-green-800">{formatCurrency(savingsDeposits)}</p>
            </div>
            <div className="card p-4 border-orange-200 bg-orange-50">
              <p className="text-xs font-medium text-orange-700">Total Withdrawn</p>
              <p className="text-2xl font-bold text-orange-800">{formatCurrency(savingsWithdrawals)}</p>
            </div>
            <div className="card p-4 border-purple-200 bg-purple-50">
              <p className="text-xs font-medium text-purple-700">Net Savings Balance</p>
              <p className="text-2xl font-bold text-purple-800">{formatCurrency(netSavings)}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Link href="/transactions/savings/deposit" className="btn-gold flex items-center gap-2">
              <PiggyBank size={16} /> Deposit to Savings
            </Link>
            <Link href="/transactions/savings/withdrawal" className="btn-secondary flex items-center gap-2">
              <ArrowUpRight size={16} /> Withdraw from Savings
            </Link>
          </div>

          {/* Savings history */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] bg-purple-50">
              <h3 className="font-semibold text-purple-800 text-sm">Savings History</h3>
            </div>
            {savingsRecords.length === 0 ? (
              <div className="p-12 text-center text-[var(--muted)]">No savings transactions yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-[var(--cream)] border-b border-[var(--border)]">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Narration</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">By</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Date</th>
                      <th className="text-right py-3 px-4 font-medium text-[var(--slate)]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savingsRecords.map((s) => (
                      <tr key={s.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            s.type === "DEPOSIT"
                              ? "bg-green-100 text-green-700 border border-green-200"
                              : "bg-orange-100 text-orange-700 border border-orange-200"
                          }`}>
                            {s.type === "DEPOSIT" ? "Deposit" : "Withdrawal"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--slate)]">{s.narration}</td>
                        <td className="py-3 px-4 text-[var(--slate)]">{s.createdBy.name}</td>
                        <td className="py-3 px-4 text-[var(--slate)]">{formatDate(s.createdAt)}</td>
                        <td className={`py-3 px-4 text-right font-semibold ${s.type === "DEPOSIT" ? "text-green-700" : "text-orange-700"}`}>
                          {s.type === "DEPOSIT" ? "+" : "−"}{formatCurrency(Number(s.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
