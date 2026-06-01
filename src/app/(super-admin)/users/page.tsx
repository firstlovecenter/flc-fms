import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import type { Prisma } from "@prisma/client";
import AddPatronModal from "@/components/users/AddPatronModal";
import PatronRowActions from "@/components/users/PatronRowActions";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, DataTableEmpty } from "@/components/layout/DataTable";

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

      <PageHeader
        variant="hero"
        eyebrow="Administration"
        title="Manage Users"
        description={`${total} patron${total !== 1 ? "s" : ""} registered`}
        actions={<AddPatronModal />}
        className="relative z-10"
      />

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

      <div className="card overflow-hidden relative z-10">
        {patrons.length === 0 ? (
          <DataTableEmpty><p>No patrons found</p></DataTableEmpty>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Bookings</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patrons.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)]">{p.name}</td>
                  <td>{p.email}</td>
                  <td>{p.phone ?? "—"}</td>
                  <td>{p._count.bookings}</td>
                  <td className="whitespace-nowrap text-body-sm">{formatDate(p.createdAt)}</td>
                  <td>
                    <span className={`badge ${p.isVerified ? "badge-approved" : "badge-pending"}`}>
                      {p.isVerified ? "Verified" : "Unverified"}
                    </span>
                  </td>
                  <td>
                    <PatronRowActions
                      patron={{
                        id: p.id,
                        name: p.name,
                        email: p.email,
                        phone: p.phone,
                        isVerified: p.isVerified,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </div>
    </div>
  );
}
