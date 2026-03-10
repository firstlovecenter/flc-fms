import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";

export default async function SuperAdminUsersPage({
  searchParams,
}: {
  searchParams: { role?: string };
}) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/login");

  const where = {
    ...(searchParams.role   ? { role: searchParams.role as any } : {}),
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const roleBadge: Record<string, string> = {
    SUPER_ADMIN:      "bg-purple-100 text-purple-700",
    FACILITY_MANAGER: "bg-brand-100 text-[var(--navy)]",
    VICAR:            "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-6 animate-fade-in" style={{ position: "relative" }}>
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
        zIndex: 1
      }}>
        <p style={{ 
          fontSize: "0.7rem", 
          textTransform: "uppercase", 
          letterSpacing: "0.08em", 
          color: "rgba(255,255,255,0.6)", 
          marginBottom: 8,
          fontWeight: 700
        }}>
          Administration
        </p>
        <h1 style={{ 
          fontFamily: "var(--font-display)", 
          fontSize: "clamp(1.75rem, 2.5vw, 2.5rem)", 
          fontWeight: 700,
          color: "#fff",
          lineHeight: 1.1,
          marginBottom: 4
        }}>
          Staff Management
        </h1>
        <p style={{ 
          fontSize: "0.95rem", 
          color: "rgba(255,255,255,0.75)" 
        }}>
          {users.length} staff members • Manage roles and permissions
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{
        padding: "16px 20px",
        background: "#fff",
        position: "relative",
        zIndex: 1
      }}>
        <form method="get" className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <select
            name="role"
            className="input w-full sm:w-auto text-sm"
            defaultValue={searchParams.role ?? ""}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              fontSize: "0.9rem"
            }}
          >
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="FACILITY_MANAGER">Facility Manager</option>
            <option value="VICAR">Vicar</option>
          </select>
          <button type="submit" className="btn-secondary text-sm py-2 px-3">Apply</button>
          {searchParams.role && (
            <a href="/users" className="btn-secondary text-sm py-2 px-3">Clear</a>
          )}
        </form>
      </div>

      <div className="card overflow-hidden" style={{
        background: "linear-gradient(135deg, #FFFFFF 0%, #FEFDFB 100%)",
        boxShadow: "0 2px 8px rgba(10,22,40,0.04), 0 1px 3px rgba(10,22,40,0.06)",
        position: "relative",
        zIndex: 1
      }}>
        <div style={{ overflowX: "auto" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "linear-gradient(135deg, rgba(10,22,40,0.03) 0%, rgba(10,22,40,0.01) 100%)", borderBottom: "1px solid var(--border)" }}>
              <tr>
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Name</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Email</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Role</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Last Login</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--border)", opacity: u.isActive ? 1 : 0.65 }} className="hover:bg-[var(--cream)]">
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "var(--navy)" }}>{u.name}</td>
                  <td style={{ padding: "12px 16px", color: "var(--slate)" }}>{u.email}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: 20,
                      background: u.role === "SUPER_ADMIN" ? "rgba(168,85,247,0.1)" : u.role === "FACILITY_MANAGER" ? "rgba(200,163,90,0.1)" : "rgba(217,119,6,0.1)",
                      color: u.role === "SUPER_ADMIN" ? "#7c3aed" : u.role === "FACILITY_MANAGER" ? "var(--gold)" : "#b45309"
                    }}>
                      {u.role.replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--muted)", fontSize: "0.9rem" }}>
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className={`badge ${u.isActive ? "badge-approved" : "badge-cancelled"}`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
