import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function FacilitiesPage() {
  const session  = await requireStaff();

  const facilities = await prisma.facility.findMany({
    where: {},
    include: { _count: { select: { bookings: { where: { status: { in: ["PENDING","APPROVED"] } } } } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const canManage = ["FACILITY_MANAGER","SUPER_ADMIN"].includes(session.role);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--navy)]">Facilities</h1>
          <p className="text-sm text-[var(--muted)]">{facilities.length} {facilities.length === 1 ? "facility" : "facilities"}</p>
        </div>
        {canManage && (
          <Link href="/facilities/new" className="btn-primary text-sm">
            <Plus size={15} /> Add Facility
          </Link>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {facilities.length === 0 ? (
          <div className="card p-10 text-center text-[var(--muted)]">
            <p>No facilities yet</p>
            {canManage && <Link href="/facilities/new" className="btn-primary mt-4 inline-block">Add your first facility</Link>}
          </div>
        ) : facilities.map((f) => (
          <Link key={f.id} href={`/facilities/${f.id}`} className="card block hover:shadow-md transition-shadow" style={{ padding: "12px 16px", opacity: f.isActive ? 1 : 0.6 }}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--navy)] text-sm">{f.name}</span>
                  {!f.isActive ? (
                    <span className="badge badge-cancelled text-[0.65rem]">Inactive</span>
                  ) : f.underMaintenance ? (
                    <span className="badge badge-pending text-[0.65rem]">Maintenance</span>
                  ) : (
                    <span className="badge badge-approved text-[0.65rem]">Active</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted)]">
                  <span>Cap: {f.capacity.toLocaleString()}</span>
                  <span>•</span>
                  <span>{formatCurrency(Number(f.pricePerHour))}/hr</span>
                  <span>•</span>
                  <span>{f._count.bookings} active booking{f._count.bookings !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <span className="text-xs text-[var(--muted)] shrink-0">Manage →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
