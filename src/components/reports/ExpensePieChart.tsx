"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";

const COLORS = ["#2e86ab", "#1e3a5f", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

interface Item { name: string; value: number; count: number; }

export default function ExpensePieChart({ data }: { data: Item[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-[var(--muted)] text-center py-8">No expense data yet.</p>;
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <ResponsiveContainer width={200} height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) => formatCurrency(v)}
            contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex-1 space-y-2 w-full">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center gap-2 text-sm">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="flex-1 truncate text-[var(--slate)]">{item.name}</span>
            <span className="font-semibold text-gray-800">{formatCurrency(item.value)}</span>
            <span className="text-[var(--muted)] text-xs">({item.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
