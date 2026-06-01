import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import type { Prisma } from "@prisma/client";
import AddPatronModal from "@/components/users/AddPatronModal";
import PatronRowActions from "@/components/users/PatronRowActions";

export default async function SuperAdminUsersPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/login");

  const where: Prisma.PatronWhereInput = {};
  if (searchParams.status === "verified")   where.isVerified = true;
  if (searchParams.status === "unverified") where.isVerified = false;
  if (searchParams.q?.trim()) {
    const q = searchParams.q.trim();
    where.OR = [
      { name:  { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }

  const patrons = await prisma.patron.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { bookings: true } } },
  });

  const total = await prisma.patron.count();

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Ambient glow */}
      <div className="absolute -top-[100px] -right-[80px] w-[350px] h-[350px] rounded-full pointer-events-none z-0"
        style={{ background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)" }} />

      {/* Hero header */}
      <div className="page-hero flex items-start justify-between gap-4 flex-wrap relative z-10">
        <div>
          <p className="section-eyebrow mb-3">Administration</p>
          <h1 className="page-title text-[clamp(1.75rem,2.5vw,2.5rem)] mb-1">Manage Users</h1>
          <p className="page-hero-muted text-[0.95rem]">
            {total} patron{total !== 1 ? "s" : ""} registered
          </p>
        </div>
        <div className="mt-1">
          <AddPatronModal />
        </div>
      </div>

      {/* Filters */}
      <div className="card p-5 relative z-10">
        <form method="get" className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-wrap">
          <input
            name="q"
            type="search"
            defaultValue={searchParams.q ?? ""}
            placeholder="Search name, email, or phone…"
            className="input text-sm w-full sm:w-64"
          />
          <select
            name="status"
            className="input w-full sm:w-auto text-sm"
            defaultValue={searchParams.status ?? ""}
          >
            <option value="">All Patrons</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
          <button type="submit" className="btn-secondary text-sm py-2 px-3">Search</button>
          {(searchParams.status || searchParams.q) && (
            <a href="/users" className="btn-secondary text-sm py-2 px-3">Clear</a>
          )}
        </form>
        {patrons.length !== total && (
          <p className="text-xs text-[var(--muted)] mt-2">Showing {patrons.length} of {total} patrons</p>
        )}
      </div>

      <div className="card" style={{
        background: "linear-gradient(135deg, #FFFFFF 0%, #FEFDFB 100%)",
        boxShadow: "0 2px 8px rgba(10,22,40,0.04), 0 1px 3px rgba(10,22,40,0.06)",
        position: "relative", zIndex: 1,
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
                <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600, color: "var(--navy)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patrons.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)" }}>
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
                  <td style={{ padding: "12px 16px" }}>
                    <PatronRowActions
                      patron={{
                        id:         p.id,
                        name:       p.name,
                        email:      p.email,
                        phone:      p.phone,
                        isVerified: p.isVerified,
                      }}
                    />
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
