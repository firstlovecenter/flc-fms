import { requireStaffPermission } from "@/lib/auth/guards";
import {
  getFinancialReport,
  getBookingReport,
  getFacilitiesReport,
  getInventoryReport,
  getCeremonyReport,
  getPatronsReport,
  getMaintenanceReport,
} from "@/actions/reports.actions";
import { resolveDateRange, type ReportPeriod } from "@/lib/reports/utils";
import ReportDashboard from "@/components/reports/ReportDashboard";
import PageHeader from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Users } from "lucide-react";

type Tab = "financial" | "bookings" | "facilities" | "inventory" | "ceremony" | "patrons" | "maintenance";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { tab?: string; period?: string; from?: string; to?: string };
}) {
  await requireStaffPermission("canViewFinancials");

  const tab    = (searchParams.tab    ?? "financial") as Tab;
  const period = (searchParams.period ?? "6m") as ReportPeriod;
  const from   = searchParams.from;
  const to     = searchParams.to;

  const range = resolveDateRange(period, from, to);

  const [financial, bookings, facilities, inventory, ceremony, patrons, maintenance] =
    await Promise.all([
      getFinancialReport(range),
      getBookingReport(range),
      getFacilitiesReport(range),
      getInventoryReport(range),
      getCeremonyReport(range),
      getPatronsReport(range),
      getMaintenanceReport(range),
    ]);

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="absolute top-[-100px] right-[-80px] w-[350px] h-[350px] rounded-full pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)" }} />

      {/* Header */}
      <PageHeader
        variant="hero"
        eyebrow="Analytics & Insights"
        title="Reports"
        description="Enterprise-grade analytics across all business domains"
        className="relative z-10"
        actions={
          <Link
            href="/reports/subscriptions"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
          >
            <Users size={15} /> Manage Subscriptions
          </Link>
        }
      />

      {/* Dashboard */}
      <div className="relative z-10">
        <ReportDashboard
          activeTab={tab}
          period={period}
          from={from ?? ""}
          to={to ?? ""}
          financial={financial}
          bookings={bookings}
          facilities={facilities}
          inventory={inventory}
          ceremony={ceremony}
          patrons={patrons}
          maintenance={maintenance}
        />
      </div>
    </div>
  );
}
