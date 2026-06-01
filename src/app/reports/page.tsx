import { requireStaff } from "@/lib/auth/guards";
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
import Link from "next/link";
import { Users } from "lucide-react";

type Tab = "financial" | "bookings" | "facilities" | "inventory" | "ceremony" | "patrons" | "maintenance";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { tab?: string; period?: string; from?: string; to?: string };
}) {
  await requireStaff("FACILITY_MANAGER");

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
      <div className="page-hero flex items-start justify-between gap-4 flex-wrap relative z-10">
        <div>
          <p className="section-eyebrow mb-3">Analytics & Insights</p>
          <h1 className="page-title mb-2">Reports</h1>
          <p className="page-hero-muted text-[0.95rem]">
            Enterprise-grade analytics across all business domains
          </p>
        </div>
        <div className="mt-1">
          <Link
            href="/reports/subscriptions"
            className="flex items-center gap-2 btn-secondary text-sm"
          >
            <Users size={15} /> Manage Subscriptions
          </Link>
        </div>
      </div>

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
