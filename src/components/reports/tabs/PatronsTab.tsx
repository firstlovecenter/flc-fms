"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Props {
  data: {
    total: number;
    newInRange: number;
    verified: number;
    unverified: number;
    activeInRange: number;
    inactiveInRange: number;
    registrationsByMonth: { label: string; count: number }[];
  };
  downloadUrl: string;
}

export default function PatronsTab({ data, downloadUrl }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Patrons",       value: data.total,           cls: "text-[var(--navy)]" },
          { label: "New in Period",       value: data.newInRange,      cls: "text-blue-700" },
          { label: "Verified",            value: data.verified,        cls: "text-green-700" },
          { label: "Unverified",          value: data.unverified,      cls: "text-yellow-700" },
          { label: "Active in Period",    value: data.activeInRange,   cls: "text-[var(--navy)]" },
          { label: "Inactive in Period",  value: data.inactiveInRange, cls: "text-[var(--muted)]" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="card p-4 border border-[var(--border)]">
            <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
            <p className={`text-xl font-bold mt-1 ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Registrations trend */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--navy)]">New Registrations per Month</h3>
          <a href={downloadUrl} className="btn-secondary text-xs py-1.5 px-3">Download CSV</a>
        </div>
        {data.registrationsByMonth.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-8">No registrations in this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={data.registrationsByMonth.map((m) => ({ month: m.label, Registrations: m.count }))}
              margin={{ left: 0, right: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Line
                type="monotone" dataKey="Registrations"
                stroke="#1e3a5f" strokeWidth={2}
                dot={{ fill: "#1e3a5f", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Verified vs Unverified donut */}
      <div className="card p-6">
        <h3 className="font-semibold text-[var(--navy)] mb-4">Verification Status</h3>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-[var(--slate)]">Verified</span>
            <span className="font-bold text-[var(--navy)]">{data.verified}</span>
            <span className="text-xs text-[var(--muted)]">
              ({data.total > 0 ? Math.round((data.verified / data.total) * 100) : 0}%)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-sm text-[var(--slate)]">Unverified</span>
            <span className="font-bold text-[var(--navy)]">{data.unverified}</span>
            <span className="text-xs text-[var(--muted)]">
              ({data.total > 0 ? Math.round((data.unverified / data.total) * 100) : 0}%)
            </span>
          </div>
        </div>
        {/* Simple progress bar */}
        <div className="mt-3 h-3 bg-yellow-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full"
            style={{ width: `${data.total > 0 ? (data.verified / data.total) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}
