import { requireStaff } from "@/lib/auth/guards";
import { getBookingContent } from "@/lib/sanity/booking-content";
import BookingContentEditor from "@/components/bookings/BookingContentEditor";
import { redirect } from "next/navigation";

export default async function BookingContentPage() {
  const session = await requireStaff();
  if (!["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"].includes(session.role)) {
    redirect("/unauthorized");
  }
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
