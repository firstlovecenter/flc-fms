import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export default async function SuperAdminUsersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/login");

  const where: Prisma.PatronWhereInput = {};
  if (searchParams.status === "active")   where.isVerified = true;
  if (searchParams.status === "inactive") where.isVerified = false;

  const patrons = await prisma.patron.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { bookings: true } } },
  });

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
          Manage Users
        </h1>
        <p style={{ 
          fontSize: "0.95rem", 
          color: "rgba(255,255,255,0.75)" 
        }}>
          {patrons.length} patron{patrons.length !== 1 ? "s" : ""} registered
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
            name="status"
            className="input w-full sm:w-auto text-sm"
            defaultValue={searchParams.status ?? ""}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              fontSize: "0.9rem"
            }}
          >
            <option value="">All Patrons</option>
            <option value="active">Verified</option>
            <option value="inactive">Unverified</option>
          </select>
          <button type="submit" className="btn-secondary text-sm py-2 px-3">Apply</button>
          {searchParams.status && (
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
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Phone</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Bookings</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Joined</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {patrons.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)" }}>
                    No patrons found
                  </td>
                </tr>
              )}
              {patrons.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-[var(--cream)]">
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "var(--navy)" }}>{p.name}</td>
                  <td style={{ padding: "12px 16px", color: "var(--slate)" }}>{p.email}</td>
                  <td style={{ padding: "12px 16px", color: "var(--slate)" }}>{p.phone ?? "—"}</td>
                  <td style={{ padding: "12px 16px", color: "var(--slate)" }}>{p._count.bookings}</td>
                  <td style={{ padding: "12px 16px", color: "var(--muted)", fontSize: "0.9rem" }}>
                    {formatDate(p.createdAt)}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className={`badge ${p.isVerified ? "badge-approved" : "badge-pending"}`}>
                      {p.isVerified ? "Verified" : "Unverified"}
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
