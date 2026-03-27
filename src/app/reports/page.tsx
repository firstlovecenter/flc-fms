import { requireStaff } from "@/lib/auth/guards";
import {
  getFinancialReport,
  getBookingReport,
  getFacilitiesReport,
  getInventoryReport,
  getCeremonyReport,
  getPatronsReport,
  getMaintenanceReport,
  resolveDateRange,
  type ReportPeriod,
} from "@/actions/reports.actions";
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
    <div className="space-y-6 animate-fade-in" style={{ position: "relative" }}>
      <div style={{
        position: "absolute", top: -100, right: -80,
        width: 350, height: 350, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(200,163,90,0.08) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Header */}
      <div className="card" style={{
        padding: "24px 28px",
        background: "linear-gradient(135deg, var(--navy) 0%, rgba(28,48,88,1) 100%)",
        borderColor: "rgba(200,163,90,0.3)",
        position: "relative", zIndex: 1,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap",
      }}>
        <div>
          <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.6)", marginBottom: 8, fontWeight: 700 }}>
            Analytics & Insights
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 2.5vw, 2.5rem)", fontWeight: 700, color: "#fff", lineHeight: 1.1, marginBottom: 4 }}>
            Reports
          </h1>
          <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.75)" }}>
            Enterprise-grade analytics across all business domains
          </p>
        </div>
        <div style={{ marginTop: 4 }}>
          <Link
            href="/reports/subscriptions"
            className="flex items-center gap-2 btn-secondary text-sm"
            style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)" }}
          >
            <Users size={15} /> Manage Subscriptions
          </Link>
        </div>
      </div>

      {/* Dashboard */}
      <div style={{ position: "relative", zIndex: 1 }}>
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
