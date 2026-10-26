"use client";

import BookingTable from "@/components/bookings/BookingTable";

export type PatronBookingRow = {
  id: string;
  title: string;
  facilityName: string;
  status: string;
  startTime: Date;
  endTime: Date;
  totalAmount: number;
};

/** A patron's bookings: a table on desktop, compact cards on phones; each opens the booking. */
export default function PatronBookingList({ bookings }: { bookings: PatronBookingRow[] }) {
  return (
    <BookingTable
      showBooker={false}
      hrefFor={(id) => `/patron/bookings/${id}`}
      rows={bookings.map((b) => ({
        id: b.id,
        title: b.title,
        facility: b.facilityName,
        startTime: new Date(b.startTime).toISOString(),
        endTime: new Date(b.endTime).toISOString(),
        amount: b.totalAmount,
        status: b.status,
      }))}
    />
  );
}
