"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";

interface MonthData {
  label: string;
  income: number;
  expenses: number;
  bookingRevenue: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", notation: "compact" }).format(v);

export default function RevenueChart({ data }: { data: MonthData[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--muted)] text-center py-8">No data yet.</p>;
  }

  const chartData = data.map((d) => ({
    month:          d.label,
    "Income":       d.income,
    "Booking Rev.": d.bookingRevenue,
    "Expenses":     d.expenses,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: number) => fmt(value)}
          contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
        <Bar dataKey="Income"        fill="#22c55e" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Booking Rev."  fill="#2e86ab" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Expenses"      fill="#ef4444" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
