"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", notation: "compact" }).format(v);
const money = (v: number) => `GH₵${v.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;

const PIE_COLORS = ["#c8a35a", "#1e3a5f", "#22c55e", "#ef4444", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4"];

interface Props {
  data: {
    monthly:           { label: string; income: number; expenses: number; bookingRevenue: number }[];
    incomeByCategory:  { category: string; total: number; count: number }[];
    expenseByCategory: { category: string; total: number; count: number }[];
  };
  downloadUrl: string;
}

export default function FinancialTab({ data, downloadUrl }: Props) {
  const totalIncome   = data.monthly.reduce((s, m) => s + m.income + m.bookingRevenue, 0);
  const totalExpenses = data.monthly.reduce((s, m) => s + m.expenses, 0);
  const net           = totalIncome - totalExpenses;

  const chartData = data.monthly.map((d) => ({
    month:          d.label,
    "Income":       d.income,
    "Booking Rev.": d.bookingRevenue,
    "Expenses":     d.expenses,
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Income",   value: money(totalIncome),   cls: "text-green-700",  bg: "bg-green-50 border-green-200" },
          { label: "Total Expenses", value: money(totalExpenses), cls: "text-red-700",    bg: "bg-red-50 border-red-200" },
          { label: "Net Balance",    value: money(net),           cls: net >= 0 ? "text-green-700" : "text-red-700", bg: net >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200" },
        ].map(({ label, value, cls, bg }) => (
          <div key={label} className={`card p-4 border ${bg}`}>
            <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
            <p className={`text-xl font-bold mt-1 ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Monthly Bar Chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--navy)]">Monthly Financial Overview</h3>
          <a href={downloadUrl} className="btn-secondary text-xs py-1.5 px-3">Download CSV</a>
        </div>
        {data.monthly.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-8">No data for selected period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Bar dataKey="Income"        fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Booking Rev."  fill="#2e86ab" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Expenses"      fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-[var(--navy)] mb-4">Income by Category</h3>
          {data.incomeByCategory.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-8">No income recorded.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.incomeByCategory.map((c) => ({ name: c.category, value: c.total }))}
                  dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {data.incomeByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-[var(--navy)] mb-4">Expenses by Category</h3>
          {data.expenseByCategory.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-8">No approved expenses.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.expenseByCategory.map((c) => ({ name: c.category, value: c.total }))}
                  dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {data.expenseByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Monthly breakdown table */}
      <div className="card p-6 overflow-x-auto">
        <h3 className="font-semibold text-[var(--navy)] mb-4">Monthly Breakdown</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {["Month", "Income", "Booking Rev.", "Expenses", "Net"].map((h) => (
                <th key={h} className="text-left py-2 px-3 font-medium text-[var(--muted)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.monthly.map((m) => {
              const net = m.income + m.bookingRevenue - m.expenses;
              return (
                <tr key={m.label} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                  <td className="py-2 px-3 font-medium text-[var(--navy)]">{m.label}</td>
                  <td className="py-2 px-3 text-green-700">{money(m.income)}</td>
                  <td className="py-2 px-3 text-blue-700">{money(m.bookingRevenue)}</td>
                  <td className="py-2 px-3 text-red-600">{money(m.expenses)}</td>
                  <td className={`py-2 px-3 font-semibold ${net >= 0 ? "text-green-700" : "text-red-600"}`}>{money(net)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
