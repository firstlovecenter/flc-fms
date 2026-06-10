import Link from "next/link";
import { Plus, Layers } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

export default async function FacilitiesPage() {
  const session  = await requireStaff();

  const facilities = await prisma.facility.findMany({
    where: {},
    include: {
      _count: {
        select: {
          bookings: { where: { status: { in: ["PENDING","APPROVED"] } } },
          pricing: { where: { isActive: true } },
          timeSlots: { where: { isActive: true } },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const canManage = ["FACILITY_MANAGER","BOOKING_MANAGER","SUPER_ADMIN"].includes(session.role);
  const isSuperAdmin = session.role === "SUPER_ADMIN";

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]">Facilities</h1>
          <p className="text-sm text-[var(--muted)]">{facilities.length} {facilities.length === 1 ? "facility" : "facilities"}</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            {isSuperAdmin && (
              <Link href="/facilities/categories" className={cn(buttonVariants({ variant: "outline" }))}>
                Categories
              </Link>
            )}
            <Link href="/facilities/bulk-slots" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
              <Layers size={15} /> Bulk Slots
            </Link>
            <Link href="/facilities/new" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
              <Plus size={15} /> Add Facility
            </Link>
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {facilities.length === 0 ? (
          <Card className="p-10 text-center text-[var(--muted)]">
            <p>No facilities yet</p>
            {canManage && <Link href="/facilities/new" className={cn(buttonVariants({ variant: "default" }), "mt-4")}>Add your first facility</Link>}
          </Card>
        ) : facilities.map((f) => (
          <Link key={f.id} href={`/facilities/${f.id}`} className="block" style={{ opacity: f.isActive ? 1 : 0.6 }}>
            <Card className="hover:shadow-md transition-shadow p-3 px-4 gap-0 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--navy)] text-sm">{f.name}</span>
                  {!f.isActive ? (
                    <StatusBadge status="CANCELLED" label="Inactive" size="xs" />
                  ) : f.underMaintenance ? (
                    <StatusBadge status="UNDER_MAINTENANCE" size="xs" />
                  ) : (
                    <StatusBadge status="APPROVED" label="Active" size="xs" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted)]">
                  <span>Cap: {f.capacity.toLocaleString()}</span>
                  <span>•</span>
                  <span>{f._count.pricing} active categor{f._count.pricing === 1 ? "y" : "ies"}</span>
                  <span>•</span>
                  <span>{f._count.timeSlots} active slots</span>
                  <span>•</span>
                  <span>{f._count.bookings} active booking{f._count.bookings !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <span className="text-xs text-[var(--muted)] shrink-0">Manage →</span>
            </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
