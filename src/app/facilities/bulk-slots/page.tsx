import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePerm } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import BulkSlotClient from "@/components/facilities/BulkSlotClient";

export default async function BulkSlotsPage() {
  await requirePerm("facilities:manage");

  const [facilities, dbCategories] = await Promise.all([
    prisma.facility.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { timeSlots: { where: { isActive: true } } } },
        pricing: { where: { isActive: true }, select: { category: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.bookingCategory.findMany({
      where: { isActive: true },
      select: { slug: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const facilityOptions = facilities.map((f) => ({
    id: f.id,
    name: f.name,
    slotCount: f._count.timeSlots,
    categories: f.pricing.map((p) => p.category),
  }));

  const bookingCategories = dbCategories.map((c) => ({
    value: c.slug,
    label: c.name,
  }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/facilities" className="p-2 rounded-lg hover:bg-gray-100 text-[var(--muted)]">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="page-title">Bulk Time Slots</h1>
          <p className="page-subtitle mt-0.5">
            Create time slots across multiple facilities at once, or copy an existing
            facility&apos;s slot configuration to other venues.
          </p>
        </div>
      </div>

      <BulkSlotClient facilities={facilityOptions} bookingCategories={bookingCategories} />
    </div>
  );
}
