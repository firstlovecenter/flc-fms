import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDate, statusBadgeClass } from "@/lib/utils";
import ExpenseActions from "@/components/expenses/ExpenseActions";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const session  = await requireStaff();
  const page = Number(searchParams.page ?? 1);
  const take = 20;

  const canApprove = ["FACILITY_MANAGER", "SUPER_ADMIN"].includes(session.role);
  const statusFilter = searchParams.status && searchParams.status !== "ALL"
    ? searchParams.status as any : undefined;

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(session.role === "VICAR" ? { createdById: session.sub } : {}),
  };

  const [expenses, total, summary] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        createdBy:  { select: { name: true, role: true } },
        approvedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.expense.count({ where }),
    prisma.expense.groupBy({
      by: ["status"],
      where: {},
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const pages = Math.ceil(total / take);
  const pending  = summary.find((s) => s.status === "PENDING");
  const approved = summary.find((s) => s.status === "APPROVED");

  return (
    <div className="space-y-6 animate-fade-in" style={{ position: "relative" }}>
      <div style={{
        position: "absolute",
        top: -100,
        right: -80,
        width: 350,
        height: 350,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      <div className="card" style={{
        padding: "24px 28px",
        background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
        borderColor: "rgba(200,163,90,0.3)",
        position: "relative",
        zIndex: 1,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        flexWrap: "wrap"
      }}>
        <div style={{
          position: "absolute",
          top: -40,
          right: -60,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "12px", color: "rgba(255,255,255,0.7)" }}>
            Financial Management
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: "8px" }}>
            Expenses
          </h1>
          <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.9)" }}>
            {total} expense records
          </p>
        </div>
        <Link href="/expenses/new" className="btn-gold flex items-center gap-2" style={{ flexShrink: 0, marginTop: "8px" }}>
          <Plus size={16} /> New Expense
        </Link>
      </div>

      {/* Summary cards */}
      {canApprove && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 border-yellow-200 bg-yellow-50">
            <p className="text-xs font-medium text-yellow-700">Pending</p>
            <p className="text-2xl font-bold text-yellow-800">{pending?._count ?? 0}</p>
            <p className="text-xs text-yellow-600 mt-0.5">{formatCurrency(Number(pending?._sum.amount ?? 0))}</p>
          </div>
          <div className="card p-4 border-green-200 bg-green-50">
            <p className="text-xs font-medium text-green-700">Approved</p>
            <p className="text-2xl font-bold text-green-800">{approved?._count ?? 0}</p>
            <p className="text-xs text-green-600 mt-0.5">{formatCurrency(Number(approved?._sum.amount ?? 0))}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["ALL", "PENDING", "APPROVED", "REJECTED"].map((s) => (
          <Link key={s} href={`/expenses?status=${s}`}
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
                  <th className="text-left py-3 px-4 font-medium text-[var(--slate)]">{canApprove ? "Actions" : ""}</th>
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
                    {canApprove && (
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/expenses/${e.id}`} className="text-xs text-[var(--navy)] hover:underline">View</Link>
                          {e.status === "PENDING" && <ExpenseActions expenseId={e.id} />}
                          {e.approvedBy && (
                            <span className="text-xs text-[var(--muted)]">by {e.approvedBy.name}</span>
                          )}
                        </div>
                      </td>
                    )}
                    {!canApprove && (
                      <td className="py-3 px-4">
                        <Link href={`/expenses/${e.id}`} className="text-xs text-[var(--navy)] hover:underline">View</Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex justify-end gap-2">
          {page > 1 && <Link href={`/expenses?status=${searchParams.status ?? "ALL"}&page=${page - 1}`} className="btn-secondary">Previous</Link>}
          {page < pages && <Link href={`/expenses?status=${searchParams.status ?? "ALL"}&page=${page + 1}`} className="btn-primary">Next</Link>}
        </div>
      )}
    </div>
  );
}
