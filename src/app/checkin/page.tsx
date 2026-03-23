import { ClipboardCheck } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { getCheckInQueue } from "@/actions/checkin.actions";
import CheckInQueue from "@/components/checkin/CheckInQueue";

export default async function CheckInPage() {
  await requireStaff();
  const bookings = await getCheckInQueue();

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[rgba(200,163,90,0.12)]">
          <ClipboardCheck size={20} className="text-[var(--gold)]" />
        </div>
        <div>
          <h1 className="page-title">Check-In / Check-Out</h1>
          <p className="page-subtitle">Today&apos;s approved bookings — check in arrivals and check out departures.</p>
        </div>
      </div>

      <CheckInQueue bookings={bookings} />
    </div>
  );
}
