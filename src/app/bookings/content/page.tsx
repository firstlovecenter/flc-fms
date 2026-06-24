import { requirePerm } from "@/lib/auth/guards";
import { getBookingContent } from "@/lib/sanity/booking-content";
import BookingContentEditor from "@/components/bookings/BookingContentEditor";

export default async function BookingContentPage() {
  await requirePerm("bookings:manage_content");
  const content = await getBookingContent();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--navy)]">Booking Content Manager</h1>
        <p className="text-sm text-[var(--muted)]">
          Edit Booking FAQs, venue booking terms, and item/package booking terms in Sanity.
        </p>
      </div>

      <BookingContentEditor initialContent={content} />
    </div>
  );
}
