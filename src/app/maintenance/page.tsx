import Link from "next/link";
import { Plus, CircleDot, Wrench, CheckCircle2 } from "lucide-react";
import { requirePerm } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import MaintenanceRequestCard from "@/components/maintenance/MaintenanceRequestCard";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { buttonVariants } from "@/components/ui/button-variants";
import { FilterPills } from "@/components/layout/ListControls";
import { EmptyState } from "@/components/ui/empty";

const TH = "px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)] whitespace-nowrap";

const STATUS_FILTERS = ["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

export default async function MaintenancePage(
  props: {
    searchParams: Promise<{ status?: string; priority?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const session = await requirePerm("maintenance:view");
  const canManage = session.role === "SUPER_ADMIN" || (session.authContext?.permissions["maintenance:manage"] ?? false);

  const where = {
    ...(searchParams.status && searchParams.status !== "ALL" ? { status: searchParams.status as any } : {}),
    ...(searchParams.priority ? { priority: searchParams.priority as any } : {}),
  };

  const [requests, summary] = await Promise.all([
    prisma.maintenanceRequest.findMany({
      where,
      include: {
        facility:    { select: { name: true } },
        requestedBy: { select: { name: true } },
        assignedTo:  { select: { name: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),
    prisma.maintenanceRequest.groupBy({
      by: ["status"],
      where: {},
      _count: true,
    }),
  ]);

  const open       = summary.find((s) => s.status === "OPEN")?._count ?? 0;
  const inProgress = summary.find((s) => s.status === "IN_PROGRESS")?._count ?? 0;
  const resolved   = summary.find((s) => s.status === "RESOLVED")?._count ?? 0;

  const serializedRequests = requests.map(r => ({
    ...r,
    estimatedCost: r.estimatedCost ? Number(r.estimatedCost) : null,
    actualCost: r.actualCost ? Number(r.actualCost) : null,
  }));

  const activeStatus = searchParams.status ?? "ALL";
  const closed = summary.find((s) => s.status === "CLOSED")?._count ?? 0;
  const countFor = (s: string) =>
    s === "ALL" ? summary.reduce((n, c) => n + c._count, 0) : summary.find((c) => c.status === s)?._count ?? 0;
  const label = (s: string) => (s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase().replace("_", " "));

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Maintenance"
        description="Repair and upkeep requests for campus facilities, most urgent first."
        actions={
          <Link href="/maintenance/new" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
            <Plus size={16} /> New request
          </Link>
        }
        className="mb-0"
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Open"        value={open}       color="warning"     icon={<CircleDot size={16} />} href="/maintenance?status=OPEN" sub="Waiting to be picked up" trend={open > 0 ? "down" : undefined} />
        <StatCard label="In progress" value={inProgress} color="maintenance" icon={<Wrench size={16} />} href="/maintenance?status=IN_PROGRESS" sub="Being worked on" />
        <StatCard label="Resolved"    value={resolved + closed} color="success" icon={<CheckCircle2 size={16} />} href="/maintenance?status=RESOLVED" sub="Fixed or closed" />
      </div>

      <FilterPills
        label="Status"
        value={activeStatus}
        options={STATUS_FILTERS.map((s) => ({
          value: s,
          label: label(s),
          count: countFor(s),
          href: s === "ALL" ? "/maintenance" : `/maintenance?status=${s}`,
        }))}
      />

      {serializedRequests.length === 0 ? (
        <EmptyState
          icon={<Wrench />}
          title={activeStatus === "ALL" ? "No maintenance requests" : `No ${label(activeStatus).toLowerCase()} requests`}
          description="Requests raised by staff for broken or worn-out facilities appear here."
          action={
            <Link href="/maintenance/new" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
              <Plus size={15} /> New request
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-card shadow-[var(--shadow-xs)]">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th data-mobile="title" className={TH}>Request</th>
                <th data-mobile="meta" className={TH}>Facility</th>
                <th data-mobile="meta" className={cn(TH, "sm:max-lg:hidden")}>Priority</th>
                <th data-mobile="meta" className={TH}>Raised</th>
                <th data-mobile="meta" className={cn(TH, "text-right sm:max-lg:hidden")}>Cost</th>
                <th data-mobile="badge" className={TH}>Status</th>
                <th className={cn(TH, "w-px")}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {serializedRequests.map((r) => (
                <MaintenanceRequestCard key={r.id} request={r} canManage={canManage} />
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
