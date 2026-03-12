import { requirePatron } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function PatronReceiptsPage() {
  const session = await requirePatron();

  const receipts = await prisma.receipt.findMany({
    where: { booking: { patronId: session.sub } },
    include: {
      booking: { select: { title: true, startTime: true, totalAmount: true } },
      payment: { select: { amount: true, paidAt: true, provider: true } },
    },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div style={{
        position: "relative",
        background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
        borderRadius: 12,
        padding: "32px 28px",
        color: "white",
        overflow: "hidden"
      }}>
        <div style={{
          position: "absolute",
          top: -40,
          right: -60,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "12px", color: "rgba(255,255,255,0.7)" }}>
            Your Account
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: "8px" }}>
            Receipts
          </h1>
          <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.9)" }}>
            View all your payment receipts and invoices
          </p>
        </div>
      </div>

      {receipts.length === 0 ? (
        <div className="card p-12 text-center text-[var(--muted)]">No receipts yet.</div>
      ) : (
        <div className="space-y-3">
          {receipts.map((r) => (
            <div key={r.id} className="card p-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-[var(--navy)]">#{r.receiptNumber}</span>
                  <span className="badge badge-approved">PAID</span>
                </div>
                <p className="text-sm text-[var(--slate)] mt-1">{r.booking.title}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {formatDateTime(r.booking.startTime)} · via {r.payment.provider}
                </p>
              </div>
              <div className="text-right">
                <p className="page-title" style={{ fontSize: "1.4rem" }}>{formatCurrency(Number(r.payment.amount))}</p>
                <p className="text-xs text-[var(--muted)]">{r.payment.paidAt ? formatDateTime(r.payment.paidAt) : ""}</p>
                {r.fileUrl && (
                  <a href={r.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[var(--gold)] hover:underline mt-1 block">
                    Download PDF
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
