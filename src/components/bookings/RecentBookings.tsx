import { formatDateTime, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { DataTable } from "@/components/layout/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface Booking {
  id: string; title: string; status: string; startTime: Date; totalAmount: unknown;
  facility: { name: string }; patron: { name: string } | null; user: { name: string } | null;
}

export default function RecentBookings({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) {
    return (
      <div className="empty-state py-10">
        <p>No bookings yet.</p>
      </div>
    );
  }

  return (
    <DataTable>
        <thead>
          <tr>
            <th>Booking</th><th>Facility</th><th>Booked by</th>
            <th>Date</th><th>Amount</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td className="font-medium text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)]">{b.title}</td>
              <td className="text-[var(--slate)]">{b.facility.name}</td>
              <td className="text-[var(--slate)]">{(b.patron ?? b.user)?.name ?? "—"}</td>
              <td className="text-[var(--slate)] text-[0.82rem]">{formatDateTime(b.startTime)}</td>
              <td className="font-medium text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)]">{formatCurrency(Number(b.totalAmount))}</td>
              <td><StatusBadge status={b.status} size="xs" /></td>
              <td><Link href={`/bookings/${b.id}`} className="link-gold text-[0.78rem] font-medium">View →</Link></td>
            </tr>
          ))}
        </tbody>
    </DataTable>
  );
}
