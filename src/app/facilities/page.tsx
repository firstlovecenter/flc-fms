import Link from "next/link";
import { Plus, Layers, Building2, ChevronRight, Tags } from "lucide-react";
import { requirePerm } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { buttonVariants } from "@/components/ui/button-variants";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/empty";
import PageHeader from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";

const TH = "px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)] whitespace-nowrap";
const TD = "px-4 py-3 align-middle";

export default async function FacilitiesPage() {
  const session = await requirePerm("facilities:view");

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

  const canManage = session.role === "SUPER_ADMIN" || (session.authContext?.permissions["facilities:manage"] ?? false);
  const isSuperAdmin = session.role === "SUPER_ADMIN";
  const active = facilities.filter((f) => f.isActive).length;
  const inMaintenance = facilities.filter((f) => f.isActive && f.underMaintenance).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Facilities"
        description="Halls, rooms and spaces on campus that can be booked. Open one to set its pricing, time slots and access code."
        meta={`${facilities.length} ${facilities.length === 1 ? "facility" : "facilities"} · ${active} active${inMaintenance ? ` · ${inMaintenance} under maintenance` : ""}`}
        actions={canManage ? (
          <>
            {isSuperAdmin && (
              <Link href="/facilities/categories" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
                <Tags size={15} /> Categories
              </Link>
            )}
            <Link href="/facilities/bulk-slots" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
              <Layers size={15} /> Bulk slots
            </Link>
            <Link href="/facilities/new" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
              <Plus size={15} /> Add facility
            </Link>
          </>
        ) : undefined}
        className="mb-0"
      />

      {facilities.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="No facilities yet"
          description="Facilities you add appear here and on the public booking site once active."
          action={canManage ? (
            <Link href="/facilities/new" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
              <Plus size={15} /> Add your first facility
            </Link>
          ) : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-card shadow-[var(--shadow-xs)]">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th data-mobile="title" className={TH}>Facility</th>
                <th data-mobile="meta" className={cn(TH, "text-right")}>Capacity</th>
                <th data-mobile="meta" className={cn(TH, "text-right sm:max-lg:hidden")}>Pricing</th>
                <th data-mobile="meta" className={cn(TH, "text-right sm:max-lg:hidden")}>Time slots</th>
                <th data-mobile="meta" className={cn(TH, "text-right")}>Open bookings</th>
                <th data-mobile="badge" className={TH}>Status</th>
                <th className={cn(TH, "w-px")}><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {facilities.map((f) => (
                <tr key={f.id} className={cn("border-t border-border/60 transition-colors hover:bg-muted/40", !f.isActive && "opacity-70")}>
                  <td className={cn(TD, "min-w-[16rem]")}>
                    <Link href={`/facilities/${f.id}`} className="group flex items-center gap-3 no-underline">
                      <span className="hidden size-12 shrink-0 overflow-hidden rounded-xl bg-muted sm:block">
                        {f.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.images[0]} alt="" className="size-full object-cover" />
                        ) : (
                          <span className="flex size-full items-center justify-center text-[var(--muted)]">
                            <Building2 size={18} />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-[var(--navy)] group-hover:underline">{f.name}</span>
                        {f.description && (
                          <span className="mt-0.5 line-clamp-1 block text-xs text-[var(--muted)]">{f.description}</span>
                        )}
                      </span>
                    </Link>
                  </td>
                  <td className={cn(TD, "text-right tabular-nums text-[var(--slate)]")}>{f.capacity.toLocaleString()}</td>
                  <td className={cn(TD, "text-right tabular-nums text-[var(--slate)] sm:max-lg:hidden")}>
                    {f._count.pricing} {f._count.pricing === 1 ? "category" : "categories"}
                  </td>
                  <td className={cn(TD, "text-right tabular-nums text-[var(--slate)] sm:max-lg:hidden")}>{f._count.timeSlots}</td>
                  <td className={cn(TD, "text-right tabular-nums text-[var(--slate)]")}>{f._count.bookings}</td>
                  <td className={TD}>
                    {!f.isActive ? (
                      <StatusBadge status="CANCELLED" label="Inactive" size="xs" />
                    ) : f.underMaintenance ? (
                      <StatusBadge status="UNDER_MAINTENANCE" size="xs" />
                    ) : (
                      <StatusBadge status="APPROVED" label="Active" size="xs" />
                    )}
                  </td>
                  <td className={TD}>
                    <Link
                      href={`/facilities/${f.id}`}
                      aria-label={`Open ${f.name}`}
                      className="flex size-8 items-center justify-center rounded-full text-[var(--muted)] hover:bg-muted hover:text-[var(--navy)]"
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
