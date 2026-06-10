"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { buttonVariants } from "@/components/ui/button-variants";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const money = (v: number) => `GH₵${v.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;

interface FacilityRow {
  id: string;
  name: string;
  capacity: number;
  isActive: boolean;
  underMaintenance: boolean;
  bookings: number;
  revenue: number;
  utilizationPct: number;
  maintenanceCount: number;
}

interface Props {
  data: FacilityRow[];
  downloadUrl: string;
}

export default function FacilitiesTab({ data, downloadUrl }: Props) {
  const totalBookings = data.reduce((s, f) => s + f.bookings, 0);
  const totalRevenue  = data.reduce((s, f) => s + f.revenue, 0);
  const underMaint    = data.filter((f) => f.underMaintenance).length;

  const chartData = [...data]
    .sort((a, b) => b.bookings - a.bookings)
    .map((f) => ({ name: f.name, Bookings: f.bookings, "Utilization %": f.utilizationPct }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Facilities",    value: data.length },
          { label: "Total Bookings",      value: totalBookings },
          { label: "Total Revenue",       value: money(totalRevenue) },
          { label: "Under Maintenance",   value: underMaint },
        ].map(({ label, value }) => (
          <Card key={label} className="p-4 border border-[var(--border)]">
            <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
            <p className="text-xl font-bold mt-1 text-[var(--navy)]">{value}</p>
          </Card>
        ))}
      </div>

      {/* Utilization chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--navy)]">Bookings & Utilization by Facility</h3>
          <a href={downloadUrl} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Download CSV</a>
        </div>
        {data.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-8">No facilities found.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 120, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} width={110} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Bookings"      fill="#1e3a5f" radius={[0, 3, 3, 0]} />
              <Bar dataKey="Utilization %" fill="#c8a35a" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Table */}
      <Card className="p-6 overflow-x-auto">
        <h3 className="font-semibold text-[var(--navy)] mb-4">Facility Details</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {["Facility", "Capacity", "Bookings", "Revenue", "Utilization", "Maintenance", "Status"].map((h) => (
                <th key={h} className="text-left py-2 px-3 font-medium text-[var(--muted)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((f) => (
              <tr key={f.id} className="border-b border-[var(--border)] hover:bg-[var(--cream)]">
                <td className="py-2 px-3 font-medium text-[var(--navy)]">{f.name}</td>
                <td className="py-2 px-3 text-[var(--slate)]">{f.capacity}</td>
                <td className="py-2 px-3 text-[var(--slate)]">{f.bookings}</td>
                <td className="py-2 px-3 text-[var(--slate)]">{money(f.revenue)}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 w-16 overflow-hidden">
                      <div className="h-full bg-[var(--navy)] rounded-full" style={{ width: `${f.utilizationPct}%` }} />
                    </div>
                    <span className="text-xs text-[var(--muted)]">{f.utilizationPct}%</span>
                  </div>
                </td>
                <td className="py-2 px-3 text-[var(--slate)]">{f.maintenanceCount} req</td>
                <td className="py-2 px-3">
                  {f.underMaintenance ? (
                    <StatusBadge status="UNDER_MAINTENANCE" label="Maintenance" size="xs" />
                  ) : f.isActive ? (
                    <StatusBadge status="APPROVED" label="Active" size="xs" />
                  ) : (
                    <StatusBadge status="CANCELLED" label="Inactive" size="xs" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
