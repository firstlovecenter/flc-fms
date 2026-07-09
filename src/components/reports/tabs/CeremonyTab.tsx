"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts";
import { buttonVariants } from "@/components/ui/button-variants";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn, formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b", ACTIVE: "#3b82f6", USED: "#22c55e", EXPIRED: "#ef4444",
};
const TYPE_COLORS = ["#1e3a5f", "#c8a35a"];

interface Props {
  data: {
    total: number;
    pending: number;
    activated: number;
    used: number;
    expired: number;
    conversionRate: number;
    statusBreakdown: { status: string; count: number }[];
    typeBreakdown:   { type: string; count: number }[];
    revenueByVenue:  { facilityId: string; facilityName: string; totalPaid: number; count: number }[];
    totalRevenue: number;
  };
  downloadUrl: string;
}

export default function CeremonyTab({ data, downloadUrl }: Props) {
  const funnel = [
    { stage: "Requested", count: data.total },
    { stage: "Activated", count: data.activated },
    { stage: "Completed", count: data.used },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Codes",      value: data.total,          cls: "text-[var(--navy)]" },
          { label: "Pending",          value: data.pending,        cls: "text-warning" },
          { label: "Active",           value: data.activated,      cls: "text-info" },
          { label: "Used / Booked",    value: data.used,           cls: "text-success" },
          { label: "Conversion Rate",  value: `${data.conversionRate}%`, cls: "text-[var(--navy)]" },
          { label: "Revenue Collected", value: formatCurrency(data.totalRevenue), cls: "text-success" },
        ].map(({ label, value, cls }) => (
          <Card key={label} className="p-4 border border-[var(--border)]">
            <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
            <p className={`text-xl font-bold mt-1 ${cls}`}>{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--navy)]">Booking Funnel</h3>
            <a href={downloadUrl} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Download CSV</a>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnel}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="stage" tick={{ fontSize: 12, fill: "#475569" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {funnel.map((_, i) => (
                  <Cell key={i} fill={["#1e3a5f", "#3b82f6", "#22c55e"][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Wedding vs Naming */}
        <Card className="p-6">
          <h3 className="font-semibold text-[var(--navy)] mb-4">Wedding vs Naming</h3>
          {data.typeBreakdown.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-8">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.typeBreakdown.map((t) => ({ name: t.type, value: t.count }))}
                  dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {data.typeBreakdown.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Status breakdown bars */}
      <Card className="p-6">
        <h3 className="font-semibold text-[var(--navy)] mb-4">Code Status Breakdown</h3>
        <div className="space-y-3">
          {data.statusBreakdown.map((s) => (
            <div key={s.status} className="flex items-center gap-3">
              <StatusBadge status={s.status} size="xs" className="w-24 justify-center" />
              <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${data.total ? (s.count / data.total) * 100 : 0}%`,
                    background: STATUS_COLORS[s.status] ?? "#9ca3af",
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-[var(--slate)] w-8 text-right">{s.count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Revenue by venue */}
      <Card className="p-6">
        <h3 className="font-semibold text-[var(--navy)] mb-4">Revenue by Venue</h3>
        {data.revenueByVenue.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-8">No data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Venue</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Codes</th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.revenueByVenue.map((v) => (
                  <tr key={v.facilityId}>
                    <td className="px-2 py-2 text-[var(--navy)] font-medium">{v.facilityName}</td>
                    <td className="px-2 py-2 text-right text-[var(--slate)]">{v.count}</td>
                    <td className="px-2 py-2 text-right font-semibold text-success">{formatCurrency(v.totalPaid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
