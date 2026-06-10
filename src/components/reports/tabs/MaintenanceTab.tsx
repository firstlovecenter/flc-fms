"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts";
import { buttonVariants } from "@/components/ui/button-variants";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const money = (v: number) => `GH₵${v.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;

const STATUS_COLORS: Record<string, string> = {
  OPEN: "#ef4444", IN_PROGRESS: "#f59e0b", RESOLVED: "#22c55e", CLOSED: "#6b7280",
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#f97316", CRITICAL: "#dc2626",
};

interface Props {
  data: {
    statusBreakdown:      { status: string; count: number }[];
    priorityBreakdown:    { priority: string; count: number }[];
    totalMaintenanceCost: number;
    avgResolutionHours:   number;
    resolvedCount:        number;
  };
  downloadUrl: string;
}

export default function MaintenanceTab({ data, downloadUrl }: Props) {
  const total = data.statusBreakdown.reduce((s, b) => s + b.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Requests",       value: total,                             cls: "text-[var(--navy)]" },
          { label: "Resolved in Period",   value: data.resolvedCount,               cls: "text-success" },
          { label: "Maintenance Cost",     value: money(data.totalMaintenanceCost), cls: "text-danger" },
          { label: "Avg Resolution",       value: `${data.avgResolutionHours}h`,    cls: "text-info" },
        ].map(({ label, value, cls }) => (
          <Card key={label} className="p-4 border border-[var(--border)]">
            <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
            <p className={`text-xl font-bold mt-1 ${cls}`}>{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status donut */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--navy)]">By Status</h3>
            <a href={downloadUrl} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Download CSV</a>
          </div>
          {data.statusBreakdown.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-8">No maintenance requests.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.statusBreakdown.map((s) => ({ name: s.status.replace("_", " "), value: s.count }))}
                  dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}
                >
                  {data.statusBreakdown.map((s, i) => (
                    <Cell key={i} fill={STATUS_COLORS[s.status] ?? "#9ca3af"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Priority bar */}
        <Card className="p-6">
          <h3 className="font-semibold text-[var(--navy)] mb-4">By Priority</h3>
          {data.priorityBreakdown.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-8">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.priorityBreakdown.map((p) => ({ Priority: p.priority, Count: p.count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="Priority" tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="Count" radius={[4, 4, 0, 0]}>
                  {data.priorityBreakdown.map((p, i) => (
                    <Cell key={i} fill={PRIORITY_COLORS[p.priority] ?? "#9ca3af"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Status summary cards */}
      <Card className="p-6">
        <h3 className="font-semibold text-[var(--navy)] mb-4">Status Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((status) => {
            const count = data.statusBreakdown.find((s) => s.status === status)?.count ?? 0;
            return (
              <div key={status} className="rounded-lg p-3 text-center border border-[var(--border)]">
                <p className="text-2xl font-bold text-[var(--navy)]">{count}</p>
                <StatusBadge status={status} size="xs" className="mt-1" />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
