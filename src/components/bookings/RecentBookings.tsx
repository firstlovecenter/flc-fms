import { formatDateTime, formatCurrency, statusBadgeClass } from "@/lib/utils";
import Link from "next/link";

interface Booking {
  id: string; title: string; status: string; startTime: Date; totalAmount: unknown;
  facility: { name: string }; patron: { name: string } | null; user: { name: string } | null;
}

export default function RecentBookings({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>No bookings yet.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Booking</th><th>Facility</th><th>Booked by</th>
            <th>Date</th><th>Amount</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td style={{ fontWeight: 500, color: "var(--navy)" }}>{b.title}</td>
              <td style={{ color: "var(--slate)" }}>{b.facility.name}</td>
              <td style={{ color: "var(--slate)" }}>{(b.patron ?? b.user)?.name ?? "—"}</td>
              <td style={{ color: "var(--slate)", fontSize: "0.82rem" }}>{formatDateTime(b.startTime)}</td>
              <td style={{ fontWeight: 500, color: "var(--navy)" }}>{formatCurrency(Number(b.totalAmount))}</td>
              <td><span className={statusBadgeClass(b.status) + " badge"}>{b.status}</span></td>
              <td><Link href={`/bookings/${b.id}`} style={{ fontSize: "0.78rem", color: "var(--gold)", textDecoration: "none", fontWeight: 500 }}>View →</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
