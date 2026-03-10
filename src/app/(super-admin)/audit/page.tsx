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
        background: "linear-gradient(135deg, #DC2626 0%, rgba(156,17,17,1) 100%)",
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
          System Auditing
        </p>
        <h1 style={{ 
          fontFamily: "var(--font-display)", 
          fontSize: "clamp(1.75rem, 2.5vw, 2.5rem)", 
          fontWeight: 700,
          color: "#fff",
          lineHeight: 1.1,
          marginBottom: 4
        }}>
          Audit Logs
        </h1>
        <p style={{ 
          fontSize: "0.95rem", 
          color: "rgba(255,255,255,0.75)" 
        }}>
          {total.toLocaleString()} total entries • Immutable record of all system actions
        </p>
      </div>

      {/* Filter Actions */}
      {logs.length > 0 && (
        <div className="card" style={{
          padding: "20px",
          background: "linear-gradient(135deg, #FFFFFF 0%, #FEFDFB 100%)",
          position: "relative",
          zIndex: 1
        }}>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 12, fontWeight: 600 }}>
            Showing <strong>{(page - 1) * take + 1}</strong> to <strong>{Math.min(page * take, total)}</strong> of <strong>{total.toLocaleString()}</strong> entries
          </p>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden" style={{
        background: "linear-gradient(135deg, #FFFFFF 0%, #FEFDFB 100%)",
        boxShadow: "0 2px 8px rgba(10,22,40,0.04), 0 1px 3px rgba(10,22,40,0.06)",
        position: "relative",
        zIndex: 1
      }}>
        {logs.length === 0 ? (
          <div style={{ 
            padding: "60px 24px", 
            textAlign: "center", 
            color: "var(--muted)" 
          }}>
            <p style={{ fontSize: "1rem" }}>No audit log entries.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead style={{ background: "linear-gradient(135deg, rgba(10,22,40,0.03) 0%, rgba(10,22,40,0.01) 100%)", borderBottom: "1px solid var(--border)" }}>
              <tr>
                <th style={{ textAlign: "left", padding: "12px", fontWeight: 600, color: "var(--navy)" }}>Time</th>
                <th style={{ textAlign: "left", padding: "12px", fontWeight: 600, color: "var(--navy)" }}>User</th>
                <th style={{ textAlign: "left", padding: "12px", fontWeight: 600, color: "var(--navy)" }}>Action</th>
                <th style={{ textAlign: "left", padding: "12px", fontWeight: 600, color: "var(--navy)" }}>Entity</th>
                <th style={{ textAlign: "left", padding: "12px", fontWeight: 600, color: "var(--navy)" }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-[var(--cream)]">
                  <td style={{ padding: "10px 12px", color: "var(--muted)", whiteSpace: "nowrap", fontSize: "0.8rem" }}>{formatDateTime(l.createdAt)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontWeight: 500, color: "var(--navy)" }}>{l.user?.name ?? "System"}</span>
                    {l.user?.role && <span style={{ color: "var(--muted)", marginLeft: 8, fontSize: "0.75rem" }}>({l.user.role})</span>}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ background: "rgba(10,22,40,0.06)", padding: "2px 8px", borderRadius: 4, fontFamily: "monospace", color: "var(--navy)", fontSize: "0.8rem" }}>{l.action}</span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--slate)" }}>
                    {l.entity}{l.entityId && <span style={{ color: "var(--muted)", marginLeft: 4 }}>#{l.entityId.slice(-6)}</span>}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--muted)", fontFamily: "monospace", fontSize: "0.75rem" }}>{l.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ 
          display: "flex", 
          justifyContent: "flex-end", 
          gap: 8, 
          fontSize: "0.85rem",
          position: "relative",
          zIndex: 1
        }}>
          {page > 1 && <Link href={`/audit?page=${page - 1}`} className="btn-secondary" style={{ padding: "8px 14px" }}>← Previous</Link>}
          <span style={{ padding: "8px 14px", color: "var(--muted)", fontSize: "0.85rem" }}>Page {page} of {pages}</span>
          {page < pages && <Link href={`/audit?page=${page + 1}`} className="btn-secondary" style={{ padding: "8px 14px" }}>Next →</Link>}
        </div>
      )}
    </div>
  );
}
