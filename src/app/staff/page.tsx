import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils";
import AddStaffModal from "@/components/staff/AddStaffModal";
import StaffRowActions from "@/components/staff/StaffRowActions";

export default async function StaffPage() {
  await requireStaff("FACILITY_MANAGER");

  const [activeStaff, inactiveStaff] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, phone: true, role: true, lastLoginAt: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: { isActive: false },
      select: { id: true, name: true, email: true, phone: true, role: true, lastLoginAt: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  ]);

  const activeFms = activeStaff.filter((u) => u.role === "FACILITY_MANAGER").length;
  const activeVicars = activeStaff.filter((u) => u.role === "VICAR").length;

  return (
    <div className="space-y-6 animate-fade-in" style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -80,
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        className="card"
        style={{
          padding: "24px 28px",
          background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
          borderColor: "rgba(200,163,90,0.3)",
          position: "relative",
          zIndex: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.6)",
              marginBottom: 8,
              fontWeight: 700,
            }}
          >
            Administration
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem, 2.5vw, 2.5rem)",
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.1,
              marginBottom: 4,
            }}
          >
            Staff Management
          </h1>
          <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.75)" }}>
            {activeStaff.length} active staff • {activeFms} Facility Manager
            {activeFms !== 1 ? "s" : ""} • {activeVicars} Vicar{activeVicars !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ marginTop: 4 }}>
          <AddStaffModal />
        </div>
      </div>

      <div
        className="card overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #FFFFFF 0%, #FEFDFB 100%)",
          boxShadow: "0 2px 8px rgba(10,22,40,0.04), 0 1px 3px rgba(10,22,40,0.06)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table className="w-full text-sm">
            <thead
              style={{
                background: "linear-gradient(135deg, rgba(10,22,40,0.03) 0%, rgba(10,22,40,0.01) 100%)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <tr>
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Name</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Email</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Phone</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Role</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Last Login</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Status</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeStaff.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-[var(--cream)]">
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "var(--navy)" }}>{u.name}</td>
                  <td style={{ padding: "12px 16px", color: "var(--slate)" }}>{u.email}</td>
                  <td style={{ padding: "12px 16px", color: "var(--slate)" }}>{u.phone ?? "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        padding: "4px 10px",
                        borderRadius: 20,
                        background:
                          u.role === "SUPER_ADMIN"
                            ? "rgba(168,85,247,0.1)"
                            : u.role === "FACILITY_MANAGER"
                              ? "rgba(200,163,90,0.1)"
                              : "rgba(217,119,6,0.1)",
                        color:
                          u.role === "SUPER_ADMIN"
                            ? "#7c3aed"
                            : u.role === "FACILITY_MANAGER"
                              ? "var(--gold)"
                              : "#b45309",
                      }}
                    >
                      {u.role.replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--muted)", fontSize: "0.9rem" }}>
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className="badge badge-approved">Active</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <StaffRowActions userId={u.id} role={u.role} name={u.name} email={u.email} phone={u.phone} profilePicture={u.profilePicture} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {inactiveStaff.length > 0 && (
        <div
          className="card overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #FFFFFF 0%, #FEFDFB 100%)",
            boxShadow: "0 2px 8px rgba(10,22,40,0.04), 0 1px 3px rgba(10,22,40,0.06)",
            position: "relative",
            zIndex: 1,
            opacity: 0.85,
          }}
        >
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", fontWeight: 600, color: "var(--navy)" }}>
            Inactive Staff ({inactiveStaff.length})
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-sm">
              <thead
                style={{
                  background: "linear-gradient(135deg, rgba(10,22,40,0.03) 0%, rgba(10,22,40,0.01) 100%)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <tr>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Name</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Email</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Phone</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Role</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Last Login</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inactiveStaff.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-[var(--cream)]">
                    <td style={{ padding: "12px 16px", fontWeight: 500, color: "var(--navy)" }}>{u.name}</td>
                    <td style={{ padding: "12px 16px", color: "var(--slate)" }}>{u.email}</td>
                    <td style={{ padding: "12px 16px", color: "var(--slate)" }}>{u.phone ?? "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          padding: "4px 10px",
                          borderRadius: 20,
                          background:
                            u.role === "SUPER_ADMIN"
                              ? "rgba(168,85,247,0.1)"
                              : u.role === "FACILITY_MANAGER"
                                ? "rgba(200,163,90,0.1)"
                                : "rgba(217,119,6,0.1)",
                          color:
                            u.role === "SUPER_ADMIN"
                              ? "#7c3aed"
                              : u.role === "FACILITY_MANAGER"
                                ? "var(--gold)"
                                : "#b45309",
                        }}
                      >
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--muted)", fontSize: "0.9rem" }}>
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="badge badge-cancelled">Inactive</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <StaffRowActions userId={u.id} role={u.role} name={u.name} email={u.email} phone={u.phone} profilePicture={u.profilePicture} inactive />
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
