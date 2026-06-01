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
      <div className="page-hero flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="section-eyebrow mb-3">Reports</p>
          <h1 className="page-title text-[clamp(1.5rem,2vw,2rem)] mb-1">Scheduled Report Subscriptions</h1>
          <p className="page-hero-muted text-[0.9rem]">
            Manage who receives automated report emails and at what cadence.
          </p>
        </div>
        <Link href="/reports" className="btn-ghost flex items-center gap-2 text-sm flex-shrink-0 mt-1 text-white/80 hover:text-white border-white/20">
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
