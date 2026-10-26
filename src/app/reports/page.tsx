import { requirePerm } from "@/lib/auth/guards";
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

export default async function ReportsPage(
  props: {
    searchParams: Promise<{ tab?: string; period?: string; from?: string; to?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  await requirePerm("reports:view");

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
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <PageHeader
        title="Reports"
        description="Finance, bookings, facilities, inventory and maintenance over a period you choose. Download any report as CSV."
        className="mb-0"
        actions={
          <Link
            href="/reports/subscriptions"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <Users size={15} /> Email subscriptions
          </Link>
        }
      />

      {/* Dashboard */}
      <div>
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
