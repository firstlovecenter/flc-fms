import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import MaintenanceRequestCard from "@/components/maintenance/MaintenanceRequestCard";

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

  // Serialize Decimal values to numbers for Client Component
  const serializedRequests = requests.map(r => ({
    ...r,
    estimatedCost: r.estimatedCost ? Number(r.estimatedCost) : null,
    actualCost: r.actualCost ? Number(r.actualCost) : null,
  })).filter((r): r is typeof r & { facility: { name: string; } } => r.facility !== null);

  return (
    <div className="space-y-6 animate-fade-in" style={{ position: "relative" }}>
      {/* Decorative background */}
      <div style={{
        position: "fixed",
        top: 100,
        right: -80,
        width: 350,
        height: 350,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      <div className="card" style={{
        padding: "24px 28px",
        background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
        borderColor: "rgba(200,163,90,0.3)",
        position: "relative",
        zIndex: 1,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        flexWrap: "wrap"
      }}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "12px", color: "rgba(255,255,255,0.7)" }}>
            Facility Management
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: "8px" }}>
            Maintenance
          </h1>
          <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.9)" }}>
            {serializedRequests.length} request{serializedRequests.length !== 1 ? "s" : ""} to manage
          </p>
        </div>
        <Link href="/maintenance/new" className="btn-primary" style={{ flexShrink: 0, marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Plus size={16} /> New Request
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4" style={{ position: "relative", zIndex: 1 }}>
        <div className="card p-5 border-yellow-200 bg-yellow-50">
          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#F59E0B", textTransform: "uppercase", marginBottom: "8px" }}>Open</p>
          <p style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--navy)" }}>{open}</p>
        </div>
        <div className="card p-5 border-blue-200 bg-blue-50">
          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#3B82F6", textTransform: "uppercase", marginBottom: "8px" }}>In Progress</p>
          <p style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--navy)" }}>{inProgress}</p>
        </div>
        <div className="card p-5 border-green-200 bg-green-50">
          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#22C55E", textTransform: "uppercase", marginBottom: "8px" }}>Resolved</p>
          <p style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--navy)" }}>{resolved}</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", position: "relative", zIndex: 1 }}>
        {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => (
          <Link 
            key={s} 
            href={`/maintenance?status=${s}`}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "0.8rem",
              fontWeight: 600,
              textDecoration: "none",
              background: (searchParams.status ?? "ALL") === s
                ? "linear-gradient(135deg, var(--navy) 0%, rgba(28, 48, 88, 1) 100%)"
                : "rgba(255, 255, 255, 0.12)",
              color: (searchParams.status ?? "ALL") === s ? "white" : "var(--slate)",
              border: `1.5px solid ${(searchParams.status ?? "ALL") === s ? "rgba(200, 163, 90, 0.3)" : "rgba(200, 163, 90, 0.15)"}`,
              boxShadow: (searchParams.status ?? "ALL") === s
                ? "0 4px 12px rgba(10, 22, 40, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                : "0 2px 8px rgba(10, 22, 40, 0.04)",
              backdropFilter: "blur(8px)",
              cursor: "pointer",
              transform: (searchParams.status ?? "ALL") === s ? "translateY(-2px)" : "translateY(0)",
            }}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      {/* Cards */}
      {serializedRequests.length === 0 ? (
        <div style={{
          background: "rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(200, 163, 90, 0.2)",
          borderRadius: "var(--r-md)",
          padding: "48px 24px",
          textAlign: "center",
          color: "var(--slate)",
          position: "relative",
          zIndex: 1,
        }}>
          No maintenance requests found.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px", position: "relative", zIndex: 1 }}>
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
