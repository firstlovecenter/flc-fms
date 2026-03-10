import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import EventForm from "@/components/events/EventForm";

export default async function NewEventPage() {
  await requireStaff();

  const facilities = await prisma.facility.findMany({
    where: { isActive: true },
    select: { id: true, name: true, capacity: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Create Event</h1>
        <p className="text-sm page-subtitle">Schedule a campus event in a facility.</p>
      </div>
      <EventForm facilities={facilities} />
    </div>
  );
}
