import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function IncomePage() {
  const session  = await requireStaff("FACILITY_MANAGER");

  const [records, byCategory, totals] = await Promise.all([
    prisma.income.findMany({
      where: {},
      include: { recordedBy: { select: { name: true } } },
      orderBy: { receivedAt: "desc" },
      take: 50,
    }),
    prisma.income.groupBy({
      by: ["category"],
      where: {},
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.income.aggregate({ where: {}, _sum: { amount: true } }),
  ]);

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
            Income
          </h1>
          <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.9)" }}>
            Total: {formatCurrency(Number(totals._sum.amount ?? 0))}
          </p>
        </div>
        <Link href="/income/new" className="btn-gold flex items-center gap-2" style={{ flexShrink: 0, marginTop: "8px" }}>
          <Plus size={16} /> Record Income
        </Link>
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {byCategory.map((c) => (
            <div key={c.category} className="card p-4 bg-green-50 border-green-200">
              <p className="text-xs font-medium text-green-700 truncate">{c.category}</p>
              <p className="text-xl font-bold text-green-800">{formatCurrency(Number(c._sum.amount ?? 0))}</p>
              <p className="text-xs text-green-600 mt-0.5">{c._count} record{c._count !== 1 ? "s" : ""}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        {records.length === 0 ? (
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
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                    <td className="py-3 px-4">
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-[var(--muted)] line-clamp-1">{r.narration}</p>
                    </td>
                    <td className="py-3 px-4 text-[var(--slate)]">{r.category}</td>
                    <td className="py-3 px-4 text-[var(--muted)]">{r.source ?? "—"}</td>
                    <td className="py-3 px-4 text-[var(--slate)]">{r.recordedBy.name}</td>
                    <td className="py-3 px-4 text-[var(--slate)]">{formatDate(r.receivedAt)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-700">
                      {formatCurrency(Number(r.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
