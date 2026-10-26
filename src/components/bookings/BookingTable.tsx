"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AcPill, ContactButtons, DateChip, formatTimeRange } from "@/components/bookings/booking-list-parts";

export type BookingTableRow = {
  id: string;
  title: string;
  /** Pills shown beside the title (type, AC, ceremony code…). */
  tags?: React.ReactNode;
  /** A quiet second line under the title. */
  subtitle?: React.ReactNode;
  facility: string;
  startTime: string;
  endTime: string;
  booker?: string;
  bookerNote?: string | null;
  phone?: string | null;
  amount: number;
  status: string;
  ac?: boolean;
};

const TH = "px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)] whitespace-nowrap";
const TD = "px-4 py-3 align-middle";

/**
 * Bookings as a table on desktop — when, what, where, who, how much, status —
 * and as compact cards on phones (see "Phone tables" in globals.css). A row
 * opens the booking: `onOpen` for a details sheet, or `hrefFor` for a page.
 */
export default function BookingTable({
  rows,
  onOpen,
  hrefFor,
  showBooker = true,
}: {
  rows: BookingTableRow[];
  onOpen?: (id: string) => void;
  hrefFor?: (id: string) => string;
  showBooker?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-card shadow-[var(--shadow-xs)]">
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/60">
          <tr>
            <th data-mobile="meta" className={cn(TH, "w-px")}>When</th>
            <th data-mobile="title" className={TH}>Booking</th>
            <th data-mobile="meta" className={TH}>Facility</th>
            {showBooker && <th data-mobile="meta" className={cn(TH, "sm:max-lg:hidden")}>Booker</th>}
            <th data-mobile="meta" className={cn(TH, "text-right")}>Amount</th>
            <th data-mobile="badge" className={TH}>Status</th>
            <th className={cn(TH, "w-px")}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const start = new Date(b.startTime);
            const open = () => onOpen?.(b.id);
            const titleClass = "text-left font-medium text-[var(--navy)] hover:underline focus-visible:underline focus-visible:outline-none";
            return (
              <tr
                key={b.id}
                onClick={(e) => {
                  // Links and buttons inside the row do their own thing.
                  if ((e.target as Element).closest("a, button")) return;
                  if (onOpen) open();
                }}
                className={cn("group border-t border-border/60 transition-colors hover:bg-muted/40", onOpen && "cursor-pointer")}
              >
                <td className={cn(TD, "whitespace-nowrap")}>
                  <span className="hidden items-center gap-3 sm:flex">
                    <DateChip iso={b.startTime} />
                    <span className="leading-tight">
                      <span className="block text-sm text-[var(--navy)]">{format(start, "EEE")}</span>
                      <span className="block text-xs text-[var(--muted)]">{formatTimeRange(b.startTime, b.endTime)}</span>
                    </span>
                  </span>
                  <span className="sm:hidden">{format(start, "EEE d MMM")}, {formatTimeRange(b.startTime, b.endTime)}</span>
                </td>
                <td className={cn(TD, "min-w-[14rem]")}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {hrefFor ? (
                      <Link href={hrefFor(b.id)} className={titleClass}>{b.title}</Link>
                    ) : (
                      <button type="button" onClick={open} className={titleClass}>{b.title}</button>
                    )}
                    {b.ac && <AcPill />}
                    {b.tags}
                  </div>
                  {b.subtitle && <div className="mt-0.5 text-xs text-[var(--muted)]">{b.subtitle}</div>}
                </td>
                <td className={cn(TD, "text-[var(--slate)]")}>{b.facility}</td>
                {showBooker && (
                  <td className={cn(TD, "sm:max-lg:hidden")}>
                    <span className="block text-[var(--navy)]">{b.booker || "—"}</span>
                    {b.bookerNote && <span className="block text-xs text-[var(--muted)]">{b.bookerNote}</span>}
                  </td>
                )}
                <td className={cn(TD, "whitespace-nowrap text-right font-medium tabular-nums text-[var(--navy)]")}>
                  {formatCurrency(b.amount)}
                </td>
                <td className={TD}>
                  <StatusBadge status={b.status} size="xs" />
                </td>
                <td className={cn(TD, "whitespace-nowrap")}>
                  <div className="flex items-center justify-end gap-1.5">
                    {b.phone && <ContactButtons phone={b.phone} compact />}
                    {hrefFor ? (
                      <Link
                        href={hrefFor(b.id)}
                        aria-label={`Open ${b.title}`}
                        className="flex size-8 items-center justify-center rounded-full text-[var(--muted)] hover:bg-muted hover:text-[var(--navy)]"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={open}
                        aria-label={`Open ${b.title}`}
                        className="flex size-8 items-center justify-center rounded-full text-[var(--muted)] hover:bg-muted hover:text-[var(--navy)]"
                      >
                        <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
