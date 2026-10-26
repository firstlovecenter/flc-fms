import Link from "next/link";
import { ArrowUpRight, ArrowDownLeft, Wrench, Zap, PiggyBank, Wallet, Clock, Download } from "lucide-react";
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
import SectionHeader from "@/components/layout/SectionHeader";
import { FilterPills, ListPagination, SegmentLinks } from "@/components/layout/ListControls";
import StatCard from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/empty";
import { hasPermission } from "@/lib/permissions";
import ExpenseActions from "@/components/expenses/ExpenseActions";
import IncomeRowActions from "@/components/expenses/IncomeRowActions";
import ExpenseRowActions from "@/components/expenses/ExpenseRowActions";


export default async function TransactionsPage(
  props: {
    searchParams: Promise<{ tab?: string; status?: string; page?: string; sType?: string; sFrom?: string; sTo?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const session = await requirePerm(["finance:view", "finance:submit_expense"]);
  const perms = session.authContext?.permissions;
  const canApproveExpenses = session.role === "SUPER_ADMIN" || (perms?.["finance:approve_expense"] ?? false);
  const canRecordIncome = session.role === "SUPER_ADMIN" || (perms?.["finance:record_income"] ?? false);
  const canSavings = session.role === "SUPER_ADMIN" || (perms?.["finance:savings"] ?? false);
  const canManageAccounts = session.role === "SUPER_ADMIN" || (perms?.["finance:manage_accounts"] ?? false);
  const canSubmitExpenses =
    session.role === "SUPER_ADMIN" ||
    (perms ? hasPermission(session.role, session.permissions, "finance:submit_expense") : false);
  const tabs = [
    ...(canApproveExpenses ? [{ key: "overview", label: "Overview" }, { key: "income", label: "Income" }] : []),
    { key: "expenses", label: canApproveExpenses ? "Expenses" : "My expense requests" },
    ...(canSavings ? [{ key: "savings", label: "Savings" }] : []),
  ];
  const defaultTab = canApproveExpenses ? "overview" : "expenses";
  const tab = tabs.some((t) => t.key === searchParams.tab) ? searchParams.tab! : defaultTab;
  const tabHref = (t: string) => `/transactions?tab=${t}`;
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
    savingsStatement, savingsAgg, accountBalances, expenseStatusCounts,
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
    canApproveExpenses || canSavings ? prisma.savingsTransaction.groupBy({
      by: ["type"],
      _sum: { amount: true },
    }) : Promise.resolve([]),
    canApproveExpenses ? getAllAccountBalances() : Promise.resolve([]),
    // Counts for the status pills ignore the current status filter.
    prisma.expense.groupBy({
      by: ["status"],
      where: { deletedAt: null, ...(!canApproveExpenses ? { createdById: session.sub } : {}) },
      orderBy: { status: "asc" },
      _count: { _all: true },
    }),
  ]);

  const incomeByCategryList = incomeByCategory.map((c) => ({
    category: c.category,
    _sum: { amount: Number(c._sum.amount ?? 0) },
    _count: c._count,
  })).sort((a, b) => Number(b._sum.amount ?? 0) - Number(a._sum.amount ?? 0));

  const pendingExp = expenseSummary.find((s) => s.status === "PENDING");
  const approvedExp = expenseSummary.find((s) => s.status === "APPROVED");
  const totalIncome = incomeTotals.totalIncome;
  const totalApprovedExpenses = Number(approvedExp?._sum.amount ?? 0);

  // Savings balance
  const savingsDeposits    = Number(savingsAgg.find((r) => r.type === "DEPOSIT")?._sum.amount    ?? 0);
  const savingsWithdrawals = Number(savingsAgg.find((r) => r.type === "WITHDRAWAL")?._sum.amount ?? 0);
  const netSavings         = savingsDeposits - savingsWithdrawals;
  const availableBalance   = totalIncome - totalApprovedExpenses - netSavings;

  const expenseCountFor = (s: string) =>
    s === "ALL"
      ? expenseStatusCounts.reduce((n, c) => n + c._count._all, 0)
      : expenseStatusCounts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Transactions"
        description={
          canApproveExpenses
            ? "Money in and out of the operating account, expense approvals and the savings account."
            : "Your expense requests and their approval status."
        }
        actions={
          <>
            {canManageAccounts && (
              <Link href="/transactions/accounts" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
                <Wallet size={16} /> Accounts
              </Link>
            )}
            {canSavings && (
              <Link href="/transactions/savings/deposit" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
                <PiggyBank size={16} /> To savings
              </Link>
            )}
            {canSubmitExpenses && (
              <Link href="/transactions/new-expense" className={cn(buttonVariants({ variant: canRecordIncome ? "outline" : "default" }), "gap-2")}>
                <ArrowUpRight size={16} /> {canApproveExpenses ? "New expense" : "Request expense"}
              </Link>
            )}
            {canRecordIncome && (
              <Link href="/transactions/new-income" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
                <ArrowDownLeft size={16} /> Record income
              </Link>
            )}
          </>
        }
        className="mb-0"
      />

      {/* Balances */}
      {canApproveExpenses && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <StatCard
              hero
              label="Available balance"
              value={formatCurrency(availableBalance)}
              icon={<Wallet size={16} />}
              sub={availableBalance >= 0 ? "Operating account, after savings" : "Overdrawn — check approvals"}
            />
          </div>
          <StatCard label="Total income" value={formatCurrency(totalIncome)} color="finance" icon={<ArrowDownLeft size={16} />} href={tabHref("income")} sub="Recorded + paid bookings" />
          <StatCard label="Approved expenses" value={formatCurrency(totalApprovedExpenses)} color="danger" icon={<ArrowUpRight size={16} />} href={`${tabHref("expenses")}&status=APPROVED`} sub="All time" />
          <StatCard
            label="Pending expenses"
            value={pendingExp?._count ?? 0}
            color="warning"
            icon={<Clock size={16} />}
            href={`${tabHref("expenses")}&status=PENDING`}
            sub={`${formatCurrency(Number(pendingExp?._sum.amount ?? 0))} awaiting approval`}
            trend={(pendingExp?._count ?? 0) > 0 ? "down" : undefined}
          />
          <StatCard label="Savings" value={formatCurrency(netSavings)} color="inventory" icon={<PiggyBank size={16} />} href={canSavings ? tabHref("savings") : undefined} sub="Separate savings account" />
        </div>
      )}

      {/* Per-account balances */}
      {canApproveExpenses && accountBalances.length > 0 && (
        <section>
          <SectionHeader
            title="Accounts"
            description="Balance of each account money is received into or paid from."
            actions={canManageAccounts ? (
              <Link href="/transactions/accounts" className="link-gold text-[0.88rem]">Manage →</Link>
            ) : undefined}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {accountBalances.map((a) => (
              <div key={a.id} className="rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-[var(--shadow-xs)]">
                <p className="truncate text-xs text-[var(--muted)]" title={a.name}>{a.name}</p>
                <p className={cn("mt-1 text-base font-medium tabular-nums", a.balance >= 0 ? "text-[var(--navy)]" : "text-danger")}>
                  {formatCurrency(a.balance)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {tabs.length > 1 && (
        <SegmentLinks
          label="Transactions"
          value={tab}
          tabs={tabs.map((t) => ({ value: t.key, label: t.label, href: tabHref(t.key) }))}
        />
      )}

      {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
      {tab === "overview" && canApproveExpenses && (
        <div className="grid gap-5 lg:grid-cols-2">
          <section>
            <SectionHeader
              title="Recent income"
              actions={<Link href={tabHref("income")} className="link-gold text-[0.88rem]">View all →</Link>}
            />
            {incomeRecords.length === 0 ? (
              <EmptyState icon={<ArrowDownLeft />} title="No income yet" description="Recorded income and paid bookings appear here." />
            ) : (
              <ul className="divide-y divide-border/70 rounded-[1.25rem] border border-border/70 bg-card shadow-[var(--shadow-xs)]">
                {incomeRecords.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                      <ArrowDownLeft size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--navy)]">{r.title}</p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {r.category}{r.source ? ` · ${r.source}` : ""} · {formatDate(r.receivedAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-success">+{formatCurrency(Number(r.amount))}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionHeader
              title="Recent expenses"
              actions={<Link href={tabHref("expenses")} className="link-gold text-[0.88rem]">View all →</Link>}
            />
            {expenses.length === 0 ? (
              <EmptyState icon={<ArrowUpRight />} title="No expenses yet" description="Expense requests appear here once submitted." />
            ) : (
              <ul className="divide-y divide-border/70 rounded-[1.25rem] border border-border/70 bg-card shadow-[var(--shadow-xs)]">
                {expenses.slice(0, 5).map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
                      <ArrowUpRight size={16} />
                    </span>
                    <Link href={`/transactions/${e.id}`} className="min-w-0 flex-1 no-underline">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate text-sm font-medium text-[var(--navy)]">{e.title}</span>
                        <StatusBadge status={e.status} size="xs" />
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                        {e.category} · {e.createdBy.name}
                      </span>
                    </Link>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-medium tabular-nums text-[var(--navy)]">−{formatCurrency(Number(e.amount))}</span>
                      {e.status === "PENDING" && !e.isTransactionCharge && <ExpenseActions expenseId={e.id} isLocked={false} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ── INCOME ───────────────────────────────────────────────────── */}
      {tab === "income" && canApproveExpenses && (
        <>
          {incomeByCategryList.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {incomeByCategryList.map((c) => (
                <div key={c.category} className="rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-[var(--shadow-xs)]">
                  <p className="truncate text-xs text-[var(--muted)]">{c.category}</p>
                  <p className="mt-1 text-base font-medium tabular-nums text-success">{formatCurrency(Number(c._sum.amount ?? 0))}</p>
                  <p className="text-xs text-[var(--muted)]">{c._count} record{c._count !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
          )}

          {incomeRecords.length === 0 ? (
            <EmptyState icon={<ArrowDownLeft />} title="No income records yet" description="Income you record appears here, newest first." />
          ) : (
            <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-card shadow-[var(--shadow-xs)]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th data-mobile="title" className={TH}>Title</th>
                      <th data-mobile="meta" className={TH}>Category</th>
                      <th data-mobile="hide" className={TH}>Source</th>
                      <th data-mobile="hide" className={TH}>Recorded by</th>
                      <th data-mobile="meta" className={TH}>Date</th>
                      <th data-mobile="badge" className={cn(TH, "text-right")}>Amount</th>
                      <th className={cn(TH, "text-right")}><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeRecords.map((r) => (
                      <tr key={r.id} className="border-t border-border/60 hover:bg-muted/40">
                        <td className={TD}>
                          <p className="font-medium text-[var(--navy)]">{r.title}</p>
                          {r.narration && <p className="line-clamp-1 text-xs text-[var(--muted)]">{r.narration}</p>}
                        </td>
                        <td className={TD}>
                          {r.category}
                          {r.account && <span className="block text-xs text-[var(--muted)]">Into {r.account.name}</span>}
                        </td>
                        <td className={cn(TD, "text-[var(--muted)]")}>{r.source ?? "—"}</td>
                        <td className={TD}>{r.recordedBy?.name ?? "System"}</td>
                        <td className={cn(TD, "whitespace-nowrap")}>{formatDate(r.receivedAt)}</td>
                        <td className={cn(TD, "text-right font-medium tabular-nums text-success")}>{formatCurrency(Number(r.amount))}</td>
                        <td className={cn(TD, "text-right")}>
                          <IncomeRowActions incomeId={r.id} isLocked={isTransactionLocked(r.createdAt)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <ListPagination page={page} pageSize={take} total={incomeTotal} hrefFor={(p) => `/transactions?tab=income&page=${p}`} />
        </>
      )}

      {/* ── EXPENSES ─────────────────────────────────────────────────── */}
      {tab === "expenses" && (
        <>
          <FilterPills
            label="Expense status"
            value={searchParams.status ?? "ALL"}
            options={(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => ({
              value: s,
              label: s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase(),
              count: expenseCountFor(s),
              href: `/transactions?tab=expenses&status=${s}`,
            }))}
          />

          {expenses.length === 0 ? (
            <EmptyState
              icon={<ArrowUpRight />}
              title={statusFilter ? `No ${statusFilter.toLowerCase()} expenses` : "No expenses yet"}
              description={canApproveExpenses ? "Expense requests from staff appear here for approval." : "Expenses you request appear here with their approval status."}
              action={canSubmitExpenses ? (
                <Link href="/transactions/new-expense" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
                  <ArrowUpRight size={15} /> {canApproveExpenses ? "New expense" : "Request expense"}
                </Link>
              ) : undefined}
            />
          ) : (
            <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-card shadow-[var(--shadow-xs)]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th data-mobile="title" className={TH}>Expense</th>
                      <th data-mobile="meta" className={TH}>Category</th>
                      <th data-mobile="meta" className={TH}>Submitted by</th>
                      <th data-mobile="meta" className={TH}>Date</th>
                      <th data-mobile="meta" className={cn(TH, "text-right")}>Amount</th>
                      <th data-mobile="badge" className={TH}>Status</th>
                      <th className={TH}><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id} className="border-t border-border/60 hover:bg-muted/40">
                        <td className={TD}>
                          <Link href={`/transactions/${e.id}`} className="font-medium text-[var(--navy)] hover:underline">{e.title}</Link>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {e.maintenanceRequest && (
                              <Link href={`/maintenance/${e.maintenanceRequest.id}`} className="inline-flex items-center gap-1 rounded-full bg-maintenance/10 px-2 py-0.5 text-[0.6875rem] font-medium text-maintenance">
                                <Wrench size={10} /> {e.maintenanceRequest.title}
                              </Link>
                            )}
                            {e.isTransactionCharge && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-inventory/10 px-2 py-0.5 text-[0.6875rem] font-medium text-inventory">
                                <Zap size={10} /> Charge
                              </span>
                            )}
                            {!e.isTransactionCharge && e.chargeExpense && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-inventory/10 px-2 py-0.5 text-[0.6875rem] font-medium text-inventory">
                                <Zap size={10} /> +{formatCurrency(Number(e.chargeExpense.amount))} charge
                              </span>
                            )}
                            {e.status === "APPROVED" && !e.receiptUrl && !e.isTransactionCharge && (
                              <StatusBadge status="UNPAID" label={isReceiptOverdue(e.approvedAt) ? "Receipt overdue" : "Receipt missing"} size="xs" />
                            )}
                          </div>
                        </td>
                        <td className={TD}>
                          {e.category}
                          {e.account && <span className="block text-xs text-[var(--muted)]">Paid via {e.account.name}</span>}
                        </td>
                        <td className={TD}>{e.createdBy.name}</td>
                        <td className={cn(TD, "whitespace-nowrap")}>{formatDate(e.spentAt ?? e.createdAt)}</td>
                        <td className={cn(TD, "text-right font-medium tabular-nums text-[var(--navy)]")}>{formatCurrency(Number(e.amount))}</td>
                        <td className={TD}>
                          <StatusBadge status={e.status} size="xs" />
                          {e.approvedBy && <span className="mt-1 block text-xs text-[var(--muted)]">by {e.approvedBy.name}</span>}
                        </td>
                        <td className={TD}>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {e.status === "APPROVED" && e.createdById === session.sub && !canApproveExpenses && !e.isTransactionCharge && (
                              <Link href={`/transactions/expenses/${e.id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                                Upload receipt
                              </Link>
                            )}
                            {canApproveExpenses && e.status === "PENDING" && !e.isTransactionCharge && <ExpenseActions expenseId={e.id} isLocked={false} />}
                            {canApproveExpenses && !e.isTransactionCharge && <ExpenseRowActions expenseId={e.id} isLocked={isExpenseLocked(e.createdAt, e.status)} />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <ListPagination
            page={page}
            pageSize={take}
            total={expenseTotal}
            hrefFor={(p) => `/transactions?tab=expenses&status=${searchParams.status ?? "ALL"}&page=${p}`}
          />
        </>
      )}

      {/* ── SAVINGS ──────────────────────────────────────────────────── */}
      {tab === "savings" && canSavings && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <StatCard hero label="Savings balance" value={formatCurrency(netSavings)} icon={<PiggyBank size={16} />} sub="Held in the savings account" />
            </div>
            <StatCard label="Transferred in" value={formatCurrency(savingsDeposits)} color="finance" icon={<ArrowDownLeft size={16} />} sub="From operating, all time" />
            <StatCard label="Transferred out" value={formatCurrency(savingsWithdrawals)} color="maintenance" icon={<ArrowUpRight size={16} />} sub="Back to operating, all time" />
          </div>

          <div className="flex flex-col gap-3 rounded-[1.25rem] border border-border/70 bg-card p-4 shadow-[var(--shadow-xs)] lg:flex-row lg:items-end lg:justify-between">
            <form action="/transactions" method="get" className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
              <input type="hidden" name="tab" value="savings" />
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="savings-stype" className="mb-1.5 block text-xs font-medium text-[var(--muted)]">Type</Label>
                <NativeSelect id="savings-stype" name="sType" defaultValue={sType ?? ""} className="w-full text-sm sm:w-44">
                  <option value="">All</option>
                  <option value="DEPOSIT">Transfers in</option>
                  <option value="WITHDRAWAL">Transfers out</option>
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="savings-sfrom" className="mb-1.5 block text-xs font-medium text-[var(--muted)]">From</Label>
                <Input id="savings-sfrom" type="date" name="sFrom" defaultValue={searchParams.sFrom ?? ""} className="text-sm" />
              </div>
              <div>
                <Label htmlFor="savings-sto" className="mb-1.5 block text-xs font-medium text-[var(--muted)]">To</Label>
                <Input id="savings-sto" type="date" name="sTo" defaultValue={searchParams.sTo ?? ""} className="text-sm" />
              </div>
              <div className="col-span-2 flex gap-2 sm:col-span-1">
                <Button type="submit">Apply</Button>
                {hasSavingsFilters && (
                  <Link href="/transactions?tab=savings" className={cn(buttonVariants({ variant: "ghost" }))}>Clear</Link>
                )}
              </div>
            </form>
            <div className="flex flex-wrap gap-2">
              <Link href="/transactions/savings/withdrawal" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
                <ArrowUpRight size={16} /> To operating
              </Link>
              <a
                href={`/api/savings/export${savingsExportQuery ? `?${savingsExportQuery}` : ""}`}
                className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
                download
              >
                <Download size={16} /> Export CSV
              </a>
            </div>
          </div>

          <section>
            <SectionHeader
              title="Savings statement"
              description={hasSavingsFilters ? "Filtered — running balances still reflect the full history." : "Every transfer between operating and savings, newest first."}
            />
            {!savingsStatement || savingsStatement.rows.length === 0 ? (
              <EmptyState
                icon={<PiggyBank />}
                title={hasSavingsFilters ? "No transfers match these filters" : "No savings transfers yet"}
                description="Transfers to and from the savings account appear here with the running balance."
              />
            ) : (
              <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-card shadow-[var(--shadow-xs)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th data-mobile="title" className={TH}>Narration</th>
                        <th data-mobile="badge" className={TH}>Type</th>
                        <th data-mobile="meta" className={TH}>By</th>
                        <th data-mobile="meta" className={TH}>Date</th>
                        <th data-mobile="meta" className={cn(TH, "text-right")}>Amount</th>
                        <th data-mobile="meta" className={cn(TH, "text-right")}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savingsStatement.rows.map((s) => (
                        <tr key={s.id} className="border-t border-border/60 hover:bg-muted/40">
                          <td className={TD}>
                            <span className="text-[var(--navy)]">{s.narration}</span>
                            {s.accountName && (
                              <span className="block text-xs text-[var(--muted)]">
                                {s.type === "DEPOSIT" ? `From ${s.accountName}` : `Into ${s.accountName}`}
                              </span>
                            )}
                          </td>
                          <td className={TD}>
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-medium",
                              s.type === "DEPOSIT" ? "bg-success/10 text-success" : "bg-maintenance/10 text-maintenance"
                            )}>
                              {s.type === "DEPOSIT" ? "Transfer in" : "Transfer out"}
                            </span>
                          </td>
                          <td className={TD}>{s.createdByName}</td>
                          <td className={cn(TD, "whitespace-nowrap")}>{formatDate(s.createdAt)}</td>
                          <td className={cn(TD, "text-right font-medium tabular-nums", s.type === "DEPOSIT" ? "text-success" : "text-maintenance")}>
                            {s.type === "DEPOSIT" ? "+" : "−"}{formatCurrency(s.amount)}
                          </td>
                          <td className={cn(TD, "text-right font-medium tabular-nums text-[var(--navy)]")}>{formatCurrency(s.balanceAfter)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

const TH = "px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)]";
const TD = "px-4 py-3 align-top text-[var(--slate)]";
