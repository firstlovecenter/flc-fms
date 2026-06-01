import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import MaintenanceRequestCard from "@/components/maintenance/MaintenanceRequestCard";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = ["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: { status?: string; priority?: string };
}) {
  const session  = await requireStaff("FACILITY_MANAGER", "VICAR");
  const canManage = ["FACILITY_MANAGER", "SUPER_ADMIN"].includes(session.role);

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

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Ambient glow */}
      <div className="fixed top-[100px] -right-[80px] w-[350px] h-[350px] rounded-full pointer-events-none z-0"
        style={{ background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)" }} />

      {/* Hero header */}
      <div className="page-hero flex items-start justify-between gap-4 flex-wrap relative z-10">
        <div>
          <p className="section-eyebrow mb-3">Facility Management</p>
          <h1 className="page-title text-[2rem] mb-2">Maintenance</h1>
          <p className="page-hero-muted text-[0.95rem]">
            {serializedRequests.length} request{serializedRequests.length !== 1 ? "s" : ""} to manage
          </p>
        </div>
        <Link href="/maintenance/new" className="btn-primary inline-flex items-center gap-2 flex-shrink-0 mt-3">
          <Plus size={16} /> New Request
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 relative z-10 stagger-children">
        <div className="stat-card" data-accent="yellow">
          <div className="stat-accent" />
          <p className="stat-label">Open</p>
          <p className="stat-value">{open}</p>
        </div>
        <div className="stat-card" data-accent="blue">
          <div className="stat-accent" />
          <p className="stat-label">In Progress</p>
          <p className="stat-value">{inProgress}</p>
        </div>
        <div className="stat-card" data-accent="green">
          <div className="stat-accent" />
          <p className="stat-label">Resolved</p>
          <p className="stat-value">{resolved}</p>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap relative z-10">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={`/maintenance?status=${s}`}
            className={cn(
              "px-4 py-2 rounded-full text-[0.8rem] font-semibold transition-all duration-150 border",
              activeStatus === s
                ? "bg-[var(--navy)] dark:bg-[var(--navy-light)] text-white border-[rgba(200,163,90,0.3)] shadow-[0_4px_12px_rgba(10,22,40,0.15)] -translate-y-0.5"
                : "bg-white/80 dark:bg-[rgba(255,255,255,0.06)] text-[var(--slate)] dark:text-[var(--muted)] border-[rgba(200,163,90,0.15)] hover:-translate-y-px hover:border-[rgba(200,163,90,0.3)]"
            )}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      {/* Cards */}
      {serializedRequests.length === 0 ? (
        <div className="empty-state card relative z-10">
          <p>No maintenance requests found.</p>
        </div>
      ) : (
        <div className="grid gap-3 relative z-10">
          {serializedRequests.map((r, idx) => (
            <MaintenanceRequestCard
              key={r.id}
              request={r}
              canManage={canManage}
              index={idx}
            />
          ))}
        </div>
      )}
    </div>
  );
}
