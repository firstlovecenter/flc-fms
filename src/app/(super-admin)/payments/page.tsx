import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import PaymentConfigForm from "@/components/staff/PaymentConfigForm";

export default async function SuperAdminPaymentsPage() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/login");

  const paymentConfig = await prisma.paymentConfig.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div style={{
        position: "relative",
        background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
        borderRadius: 12,
        padding: "32px 28px",
        paddingRight: "48px",
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
            Administration
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: "8px" }}>
            Payment Gateway Configuration
          </h1>
          <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.9)", maxWidth: "500px" }}>
            Configure the global payment provider. Secret keys are encrypted at rest with AES-256-GCM.
          </p>
        </div>
      </div>

      <div style={{
        background: "linear-gradient(135deg, rgba(217,119,6,0.08) 0%, rgba(217,119,6,0.04) 100%)",
        border: "1px solid rgba(217,119,6,0.2)",
        borderRadius: 8,
        padding: "16px 20px",
        fontSize: "0.9rem",
        color: "#92400e",
        fontWeight: 500
      }}>
        <strong style={{ color: "#b45309" }}>Security Note:</strong> Secret keys are encrypted before being stored. They are never returned in full — you must re-enter them to update. Webhook secrets are optional but strongly recommended.
      </div>

      <div className="card overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[var(--cream)] border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-[var(--navy)] flex items-center justify-center font-bold text-sm">
              FLC
            </div>
            <div>
              <p className="font-semibold text-[var(--navy)]">First Love Center</p>
              <p className="text-xs text-[var(--muted)]">Global Payment Configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!paymentConfig ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <AlertCircle size={14} /> Not configured
              </span>
            ) : paymentConfig.isActive ? (
              <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <CheckCircle size={14} /> {paymentConfig.provider} · Active
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                <XCircle size={14} /> Disabled
              </span>
            )}
          </div>
        </div>

        {/* Config form */}
        <div className="p-6">
          <PaymentConfigForm
            campusId="global"
            currentProvider={paymentConfig?.provider ?? null}
            currentPublicKey={paymentConfig?.publicKey ?? null}
            lastUpdated={paymentConfig?.updatedAt ?? null}
          />
        </div>
      </div>
    </div>
  );
}
