import Link from "next/link";
import { Plus, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDate, statusBadgeClass } from "@/lib/utils";
import ExpenseActions from "@/components/expenses/ExpenseActions";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { tab?: string; status?: string; page?: string };
}) {
  const session = await requireStaff();
  const isFM = ["FACILITY_MANAGER", "SUPER_ADMIN"].includes(session.role);
  const tab = isFM ? (searchParams.tab ?? "overview") : "expenses";
  const page = Number(searchParams.page ?? 1);
  const take = 20;

  // Expense filters
  const statusFilter = searchParams.status && searchParams.status !== "ALL"
    ? searchParams.status as "PENDING" | "APPROVED" | "REJECTED" : undefined;

  const expenseWhere = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(session.role === "VICAR" ? { createdById: session.sub } : {}),
  };

  // Fetch data in parallel
  const [
    expenses, expenseTotal, expenseSummary,
    incomeRecords, incomeTotals, incomeByCategory,
  ] = await Promise.all([
    prisma.expense.findMany({
      where: expenseWhere,
      include: {
        createdBy: { select: { name: true, role: true } },
        approvedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.expense.count({ where: expenseWhere }),
    prisma.expense.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: true,
    }),
    isFM ? prisma.income.findMany({
      include: { recordedBy: { select: { name: true } } },
      orderBy: { receivedAt: "desc" },
      take: 50,
    }) : Promise.resolve([]),
    isFM ? prisma.income.aggregate({ _sum: { amount: true } }) : Promise.resolve({ _sum: { amount: null } }),
    isFM ? prisma.income.groupBy({
      by: ["category"],
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
    }) : Promise.resolve([]),
  ]);

  const expensePages = Math.ceil(expenseTotal / take);
  const pendingExp = expenseSummary.find((s) => s.status === "PENDING");
  const approvedExp = expenseSummary.find((s) => s.status === "APPROVED");
  const totalIncome = Number(incomeTotals._sum.amount ?? 0);
  const totalApprovedExpenses = Number(approvedExp?._sum.amount ?? 0);
  const balance = totalIncome - totalApprovedExpenses;

  // Build tab link helper
  const tabHref = (t: string) => `/transactions?tab=${t}`;
  const tabs = isFM
    ? [
        { key: "overview", label: "Overview" },
        { key: "income", label: "Income" },
        { key: "expenses", label: "Expenses" },
      ]
    : [{ key: "expenses", label: "My Expense Requests" }];

  return (
    <div className="space-y-6 animate-fade-in" style={{ position: "relative" }}>
      <div style={{
        position: "absolute", top: -100, right: -80, width: 350, height: 350,
        borderRadius: "50%", background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Header */}
      <div className="card" style={{
        padding: "24px 28px",
        background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
        borderColor: "rgba(200,163,90,0.3)", position: "relative", zIndex: 1,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        gap: 16, flexWrap: "wrap",
      }}>
        <div style={{
          position: "absolute", top: -40, right: -60, width: 300, height: 300,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "12px", color: "rgba(255,255,255,0.7)" }}>
            Financial Management
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: "8px" }}>
            Transactions
          </h1>
          {isFM && (
            <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.9)" }}>
              Balance: <strong style={{ color: balance >= 0 ? "#86efac" : "#fca5a5" }}>{formatCurrency(balance)}</strong>
            </p>
          )}
        </div>
        <div className="flex gap-2" style={{ flexShrink: 0, marginTop: "8px" }}>
          {isFM && (
            <Link href="/transactions/new-income" className="btn-gold flex items-center gap-2">
              <ArrowDownLeft size={16} /> Record Income
            </Link>
          )}
          <Link href="/transactions/new-expense" className="btn-gold flex items-center gap-2">
            <ArrowUpRight size={16} /> {isFM ? "New Expense" : "Request Expense"}
          </Link>
        </div>
      </div>

      {/* FM Balance Cards */}
      {isFM && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <div className={`card p-4 ${balance >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
            <p className={`text-xs font-medium ${balance >= 0 ? "text-emerald-700" : "text-red-700"}`}>Net Balance</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? "text-emerald-800" : "text-red-800"}`}>{formatCurrency(balance)}</p>
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
                <table className="w-full text-sm">
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
                <table className="w-full text-sm">
                  <tbody>
                    {expenses.slice(0, 5).map((e) => (
                      <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                        <td className="py-2.5 px-4">
                          <p className="font-medium text-[var(--navy)]">{e.title}</p>
                          <p className="text-xs text-[var(--muted)]">{e.category} · {e.createdBy.name}</p>
                        </td>
                        <td className="py-2.5 px-4"><span className={statusBadgeClass(e.status)}>{e.status}</span></td>
                        <td className="py-2.5 px-4 text-right font-semibold">{formatCurrency(Number(e.amount))}</td>
                        <td className="py-2.5 px-4">
                          {e.status === "PENDING" && <ExpenseActions expenseId={e.id} />}
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
          {incomeByCategory.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {incomeByCategory.map((c) => (
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
                <table className="w-full text-sm">
                  <thead className="bg-[var(--cream)] border-b border-[var(--border)]">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Title</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Category</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Source</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Recorded By</th>
                      <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">Date</th>
                      <th className="text-right py-3 px-4 font-medium text-[var(--slate)]">Amount</th>
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
                <table className="w-full text-sm">
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
                          <p className="font-medium text-[var(--navy)]">{e.title}</p>
                          <p className="text-xs text-[var(--muted)] line-clamp-1 mt-0.5">{e.narration}</p>
                        </td>
                        <td className="py-3 px-4 text-[var(--slate)]">{e.category}</td>
                        <td className="py-3 px-4 text-[var(--slate)]">
                          {e.createdBy.name}
                          <p className="text-xs text-[var(--muted)]">{e.createdBy.role}</p>
                        </td>
                        <td className="py-3 px-4 text-[var(--slate)]">{formatDate(e.createdAt)}</td>
                        <td className="py-3 px-4 text-right font-semibold">{formatCurrency(Number(e.amount))}</td>
                        <td className="py-3 px-4">
                          <span className={statusBadgeClass(e.status)}>{e.status}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Link href={`/transactions/${e.id}`} className="text-xs text-[var(--navy)] hover:underline">View</Link>
                            {isFM && e.status === "PENDING" && <ExpenseActions expenseId={e.id} />}
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
            <div className="flex justify-end gap-2">
              {page > 1 && <Link href={`/transactions?tab=expenses&status=${searchParams.status ?? "ALL"}&page=${page - 1}`} className="btn-secondary">Previous</Link>}
              {page < expensePages && <Link href={`/transactions?tab=expenses&status=${searchParams.status ?? "ALL"}&page=${page + 1}`} className="btn-primary">Next</Link>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
