import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

export default async function AuditPage({ searchParams }: { searchParams: { page?: string; action?: string } }) {
  await requireRole("SUPER_ADMIN");

  const page = Number(searchParams.page ?? 1);
  const take = 50;

  const where = searchParams.action ? { action: searchParams.action } : {};

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const pages = Math.ceil(total / take);

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Ambient glow */}
      <div className="absolute -top-[100px] -right-[80px] w-[350px] h-[350px] rounded-full pointer-events-none z-0"
        style={{ background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)" }} />

      {/* Hero header — red for system/danger context */}
      <div className="card relative z-10 overflow-hidden"
        style={{ padding: "24px 28px", background: "linear-gradient(135deg, #DC2626 0%, #9C1111 100%)", borderColor: "rgba(200,163,90,0.3)" }}>
        <p className="text-[0.7rem] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.6)] font-bold mb-2">
          System Auditing
        </p>
        <h1 className="text-[clamp(1.75rem,2.5vw,2.5rem)] font-bold text-white leading-[1.1] mb-1" style={{ fontFamily: "var(--font-display)" }}>
          Audit Logs
        </h1>
        <p className="text-[0.95rem] text-[rgba(255,255,255,0.75)]">
          {total.toLocaleString()} total entries • Immutable record of all system actions
        </p>
      </div>

      {/* Count info */}
      {logs.length > 0 && (
        <div className="card p-5 relative z-10">
          <p className="text-[0.85rem] text-[var(--text-muted)] font-semibold">
            Showing <strong className="text-[var(--navy)]">{(page - 1) * take + 1}</strong> to{" "}
            <strong className="text-[var(--navy)]">{Math.min(page * take, total)}</strong> of{" "}
            <strong className="text-[var(--navy)]">{total.toLocaleString()}</strong> entries
          </p>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden relative z-10">
        {logs.length === 0 ? (
          <div className="empty-state py-16">
            <p>No audit log entries.</p>
          </div>
        ) : (
          <div className="table-scroll-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap text-[0.8rem]">{formatDateTime(l.createdAt)}</td>
                    <td>
                      <span className="font-medium text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)]">
                        {l.user?.name ?? "System"}
                      </span>
                      {l.user?.role && (
                        <span className="text-[var(--text-muted)] ml-2 text-[0.75rem]">
                          ({l.user.role})
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="bg-[rgba(10,22,40,0.06)] dark:bg-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded font-mono text-[var(--navy)] dark:text-[rgba(200,220,255,0.85)] text-[0.8rem]">
                        {l.action}
                      </span>
                    </td>
                    <td>
                      {l.entity}
                      {l.entityId && (
                        <span className="text-[var(--text-muted)] ml-1">#{l.entityId.slice(-6)}</span>
                      )}
                    </td>
                    <td className="font-mono text-[0.75rem]">{l.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-end items-center gap-2 text-[0.85rem] relative z-10">
          {page > 1 && <Link href={`/audit?page=${page - 1}`} className="btn-secondary">← Previous</Link>}
          <span className="text-[var(--text-muted)] px-3">Page {page} of {pages}</span>
          {page < pages && <Link href={`/audit?page=${page + 1}`} className="btn-secondary">Next →</Link>}
        </div>
      )}
    </div>
  );
}
