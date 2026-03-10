import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import ToggleMaintenanceButton from "@/components/facilities/ToggleMaintenanceButton";
import { formatCurrency } from "@/lib/utils";

export default async function FacilitiesPage() {
  const session  = await requireStaff();

  const facilities = await prisma.facility.findMany({
    where: {},
    include: { _count: { select: { bookings: { where: { status: { in: ["PENDING","APPROVED"] } } } } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  // Serialize Decimal values to numbers for Client Component
  const serializedFacilities = facilities.map(f => ({
    ...f,
    pricePerHour: Number(f.pricePerHour),
    pricePerDay: Number(f.pricePerDay),
    maintenanceStartsAt: f.maintenanceStartsAt?.toISOString() ?? null,
    maintenanceEndsAt: f.maintenanceEndsAt?.toISOString() ?? null,
  }));

  const canManage = ["FACILITY_MANAGER","SUPER_ADMIN"].includes(session.role);

  return (
    <div className="space-y-8 animate-fade-in" style={{ position: "relative" }}>
      {/* Decorative background */}
      <div style={{
        position: "absolute",
        top: -100,
        right: -80,
        width: 350,
        height: 350,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      {/* Header */}
      <div className="card" style={{
        padding: "24px 28px",
        background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
        borderColor: "rgba(200,163,90,0.3)",
        position: "relative",
        zIndex: 1,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16
      }}>
        <div style={{ color: "#fff" }}>
          <p style={{ 
            fontSize: "0.7rem", 
            textTransform: "uppercase", 
            letterSpacing: "0.08em", 
            color: "rgba(255,255,255,0.6)", 
            marginBottom: 8,
            fontWeight: 700
          }}>
            Campus
          </p>
          <h1 style={{ 
            fontFamily: "var(--font-display)", 
            fontSize: "clamp(1.75rem, 2.5vw, 2.5rem)", 
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 4
          }}>
            Facilities
          </h1>
          <p style={{ 
            fontSize: "0.95rem", 
            color: "rgba(255,255,255,0.75)" 
          }}>
              {serializedFacilities.length} {serializedFacilities.length === 1 ? "facility" : "facilities"} managed • Manage your venue portfolio
          </p>
        </div>
        {canManage && (
          <Link href="/facilities/new" className="btn-gold" style={{ flexShrink: 0, marginTop: 8 }}>
            <Plus size={15} /> Add Facility
          </Link>
        )}
      </div>

      {serializedFacilities.length === 0 ? (
        <div className="card p-16 text-center" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ width: 48, height: 48, background: "var(--gold-pale)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Plus size={20} style={{ color: "var(--gold)" }} />
          </div>
          <p style={{ color: "var(--muted)", marginBottom: 16 }}>No facilities yet</p>
          {canManage && <Link href="/facilities/new" className="btn-primary">Add your first facility</Link>}
        </div>
      ) : (
        <div className="card overflow-hidden" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "linear-gradient(135deg, rgba(10,22,40,0.03) 0%, rgba(10,22,40,0.01) 100%)", borderBottom: "1px solid var(--border)" }}>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Facility</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Capacity</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Hours</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Rate</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Bookings</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {serializedFacilities.map((f) => (
                  <tr key={f.id} style={{ borderBottom: "1px solid var(--border)", opacity: f.isActive ? 1 : 0.75 }} className="hover:bg-[var(--cream)]">
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "var(--navy)" }}>{f.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>
                        {f.description || "No description"}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--slate)" }}>{f.capacity.toLocaleString()}</td>
                    <td style={{ padding: "12px 16px", color: "var(--slate)" }}>{f.availableFrom} - {f.availableTo}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--gold)" }}>{formatCurrency(f.pricePerHour)}/hr</td>
                    <td style={{ padding: "12px 16px", color: "var(--slate)" }}>{f._count.bookings}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {!f.isActive ? (
                        <span className="badge badge-cancelled">Inactive</span>
                      ) : f.underMaintenance ? (
                        <span className="badge badge-pending">Maintenance</span>
                      ) : (
                        <span className="badge badge-approved">Active</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div className="flex items-center gap-2">
                        <Link href={`/facilities/${f.id}`} className="btn-secondary" style={{ padding: "6px 10px", fontSize: "0.8rem" }}>
                          Manage
                        </Link>
                        {canManage && (
                          <ToggleMaintenanceButton
                            facilityId={f.id}
                            underMaintenance={f.underMaintenance}
                            maintenanceStartsAt={f.maintenanceStartsAt}
                            maintenanceEndsAt={f.maintenanceEndsAt}
                          />
                        )}
                      </div>
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
