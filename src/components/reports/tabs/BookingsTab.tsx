"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", notation: "compact" }).format(v);
const money = (v: number) => `GH₵${v.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;

const PIE_COLORS = ["#1e3a5f", "#c8a35a", "#22c55e", "#ef4444", "#3b82f6", "#8b5cf6", "#f59e0b"];
const STATUS_COLORS: Record<string, string> = {
  APPROVED: "#22c55e", COMPLETED: "#3b82f6", PENDING: "#f59e0b",
  REJECTED: "#ef4444", CANCELLED: "#6b7280",
};

interface Props {
  data: {
    statusBreakdown:   { status: string; count: number; revenue: number }[];
    facilityBreakdown: { facilityId: string; facilityName: string; count: number; revenue: number }[];
    categoryBreakdown: { category: string; count: number; revenue: number }[];
    avgValue: number;
    totalPaid: number;
  };
  downloadUrl: string;
}

export default function BookingsTab({ data, downloadUrl }: Props) {
  const total = data.statusBreakdown.reduce((s, b) => s + b.count, 0);
  const totalRevenue = data.statusBreakdown.reduce((s, b) => s + b.revenue, 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Bookings",    value: total },
          { label: "Total Revenue",     value: money(totalRevenue) },
          { label: "Avg Booking Value", value: money(data.avgValue) },
          { label: "Paid Bookings",     value: data.totalPaid },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4 border border-[var(--border)]">
            <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
            <p className="text-xl font-bold mt-1 text-[var(--navy)]">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--navy)]">Bookings by Status</h3>
            <a href={downloadUrl} className="btn-secondary text-xs py-1.5 px-3">Download CSV</a>
          </div>
          <div className="space-y-3">
            {data.statusBreakdown.map((b) => (
              <div key={b.status} className="flex items-center gap-3">
                <span className="text-xs font-bold w-24 text-[var(--slate)]">{b.status}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${total ? (b.count / total) * 100 : 0}%`,
                      background: STATUS_COLORS[b.status] ?? "#9ca3af",
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-[var(--slate)] w-8 text-right">{b.count}</span>
                <span className="text-xs text-[var(--muted)] w-24 text-right">{money(b.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Category donut */}
        <div className="card p-6">
          <h3 className="font-semibold text-[var(--navy)] mb-4">By Category</h3>
          {data.categoryBreakdown.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-8">No data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.categoryBreakdown.map((c) => ({ name: c.category, value: c.count }))}
                  dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}
                >
                  {data.categoryBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Facilities bar */}
      <div className="card p-6">
        <h3 className="font-semibold text-[var(--navy)] mb-4">Revenue by Facility</h3>
        {data.facilityBreakdown.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-8">No facility bookings in this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={data.facilityBreakdown.map((f) => ({ name: f.facilityName, Bookings: f.count, Revenue: f.revenue }))}
              layout="vertical"
              margin={{ left: 100, right: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number, name) => name === "Revenue" ? fmt(v) : v} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Revenue"  fill="#1e3a5f" radius={[0, 3, 3, 0]} />
              <Bar dataKey="Bookings" fill="#c8a35a" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
