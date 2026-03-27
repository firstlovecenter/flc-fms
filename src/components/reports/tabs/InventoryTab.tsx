"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const CONDITION_COLORS: Record<string, string> = {
  EXCELLENT: "#22c55e", GOOD: "#3b82f6", FAIR: "#f59e0b",
  POOR: "#ef4444", DAMAGED: "#dc2626", DISPOSED: "#6b7280",
};
const PIE_COLORS = ["#1e3a5f", "#c8a35a", "#22c55e", "#ef4444", "#3b82f6", "#6b7280"];

interface Props {
  data: {
    totalItems: number;
    checkedOut: number;
    overdue: number;
    underMaintenance: number;
    conditionBreakdown: { condition: string; count: number }[];
    statusBreakdown:    { status: string; count: number }[];
    checkoutByMonth:    { label: string; count: number }[];
    overdueItems: { id: string; name: string; quantity: number; dueBack: Date | null }[];
  };
  downloadUrl: string;
}

export default function InventoryTab({ data, downloadUrl }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Items",        value: data.totalItems,         cls: "text-[var(--navy)]" },
          { label: "Checked Out",        value: data.checkedOut,         cls: "text-blue-700" },
          { label: "Overdue",            value: data.overdue,            cls: data.overdue > 0 ? "text-red-600" : "text-[var(--navy)]" },
          { label: "Under Maintenance",  value: data.underMaintenance,   cls: "text-yellow-700" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="card p-4 border border-[var(--border)]">
            <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
            <p className={`text-xl font-bold mt-1 ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Checkout trend + condition breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--navy)]">Monthly Checkouts</h3>
            <a href={downloadUrl} className="btn-secondary text-xs py-1.5 px-3">Download CSV</a>
          </div>
          {data.checkoutByMonth.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-8">No checkouts in period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.checkoutByMonth.map((m) => ({ month: m.label, Checkouts: m.count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="Checkouts" fill="#1e3a5f" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-[var(--navy)] mb-4">Item Condition Breakdown</h3>
          {data.conditionBreakdown.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-8">No items found.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.conditionBreakdown.map((c) => ({ name: c.condition, value: c.count }))}
                  dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}
                >
                  {data.conditionBreakdown.map((c, i) => (
                    <Cell key={i} fill={CONDITION_COLORS[c.condition] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Overdue items */}
      {data.overdueItems.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-red-700 mb-4">Overdue Checkouts</h3>
          <div className="space-y-2">
            {data.overdueItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <span className="font-medium text-[var(--navy)]">{item.name}</span>
                <span className="text-xs text-[var(--muted)]">Qty: {item.quantity}</span>
                <span className="text-xs text-red-600">
                  Due: {item.dueBack ? new Date(item.dueBack).toLocaleDateString() : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status breakdown */}
      <div className="card p-6">
        <h3 className="font-semibold text-[var(--navy)] mb-4">Items by Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {data.statusBreakdown.map((s) => (
            <div key={s.status} className="bg-[var(--cream)] rounded-lg p-3 text-center border border-[var(--border)]">
              <p className="text-2xl font-bold text-[var(--navy)]">{s.count}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{s.status.replace("_", " ")}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
