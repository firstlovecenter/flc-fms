import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DateChip, formatTimeRange } from "@/components/bookings/booking-list-parts";

export type PatronBookingRow = {
  id: string;
  title: string;
  facilityName: string;
  status: string;
  startTime: Date;
  endTime: Date;
  totalAmount: number;
};

/** A patron's bookings as compact rows in one card; each row opens the booking. */
export default function PatronBookingList({ bookings }: { bookings: PatronBookingRow[] }) {
  return (
    <ul className="divide-y divide-border/70 overflow-hidden rounded-[1.25rem] border border-border/70 bg-card shadow-[var(--shadow-xs)]">
      {bookings.map((b) => (
        <li key={b.id}>
          <Link
            href={`/patron/bookings/${b.id}`}
            className="group flex items-center gap-3 px-4 py-3.5 no-underline transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-5"
          >
            <DateChip iso={b.startTime.toISOString()} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="truncate text-sm font-medium text-[var(--navy)]">{b.title}</span>
                <StatusBadge status={b.status} size="xs" />
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--muted)]">
                <span>{b.facilityName}</span>
                <span aria-hidden>·</span>
                <span>{formatTimeRange(b.startTime.toISOString(), b.endTime.toISOString())}</span>
              </p>
            </div>
            <span className="hidden shrink-0 text-sm font-medium tabular-nums text-[var(--navy)] sm:inline">
              {formatCurrency(b.totalAmount)}
            </span>
            <ChevronRight size={16} className="shrink-0 text-[var(--muted)] transition-transform group-hover:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
