import { requirePerm } from "@/lib/auth/guards";
import { listReportSubscriptions } from "@/actions/report-subscription.actions";
import SubscriptionManager from "@/components/reports/SubscriptionManager";
import PageHeader from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

import { Card } from "@/components/ui/card";

export default async function ReportSubscriptionsPage() {
  await requirePerm("reports:manage_subscriptions");

  const subscriptions = await listReportSubscriptions();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        variant="hero"
        eyebrow="Reports"
        title="Scheduled Report Subscriptions"
        description="Manage who receives automated report emails and at what cadence."
        actions={
          <Link href="/reports" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2 flex-shrink-0 text-[#fff]/80 hover:text-[#fff] border-white/20")}>
            <ArrowLeft size={15} /> Back to Reports
          </Link>
        }
      />

      {/* Info banner */}
      <Card className="p-4 flex items-start gap-3 bg-info/10 border-info/25">
        <Mail size={18} className="text-info mt-0.5 shrink-0" />
        <div className="text-sm text-info">
          <p className="font-semibold">How scheduled reports work</p>
          <p className="mt-1 text-info">
            Each subscriber receives an email on the chosen cadence with a KPI summary and CSV attachments for each selected report type.
            Reports run automatically via cron: weekly (Mon 08:00), monthly (1st, 07:00), quarterly (Jan/Apr/Jul/Oct 1st), yearly (Jan 1).
          </p>
        </div>
      </Card>

      <SubscriptionManager initialSubscriptions={subscriptions as any} />
    </div>
  );
}
