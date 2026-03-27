import { requireStaff } from "@/lib/auth/guards";
import { listReportSubscriptions } from "@/actions/report-subscription.actions";
import SubscriptionManager from "@/components/reports/SubscriptionManager";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default async function ReportSubscriptionsPage() {
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");

  const subscriptions = await listReportSubscriptions();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="card" style={{
        padding: "24px 28px",
        background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
        borderColor: "rgba(200,163,90,0.3)",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap",
      }}>
        <div>
          <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.6)", marginBottom: 8, fontWeight: 700 }}>
            Reports
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 2vw, 2rem)", fontWeight: 700, color: "#fff", lineHeight: 1.1, marginBottom: 4 }}>
            Scheduled Report Subscriptions
          </h1>
          <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.75)" }}>
            Manage who receives automated report emails and at what cadence.
          </p>
        </div>
        <Link
          href="/reports"
          className="flex items-center gap-2 btn-secondary text-sm"
          style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)" }}
        >
          <ArrowLeft size={15} /> Back to Reports
        </Link>
      </div>

      {/* Info banner */}
      <div className="card p-4 flex items-start gap-3 bg-blue-50 border-blue-200">
        <Mail size={18} className="text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">How scheduled reports work</p>
          <p className="mt-1 text-blue-700">
            Each subscriber receives an email on the chosen cadence with a KPI summary and CSV attachments for each selected report type.
            Reports run automatically via cron: weekly (Mon 08:00), monthly (1st, 07:00), quarterly (Jan/Apr/Jul/Oct 1st), yearly (Jan 1).
          </p>
        </div>
      </div>

      <SubscriptionManager initialSubscriptions={subscriptions as any} />
    </div>
  );
}
