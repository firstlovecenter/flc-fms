import { NextRequest, NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/guards";
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
import {
  financialToCSV,
  bookingsToCSV,
  facilitiesToCSV,
  inventoryToCSV,
  ceremonyToCSV,
  patronsToCSV,
  maintenanceToCSV,
} from "@/lib/reports/csv";
import { format } from "date-fns";

const ALLOWED_TYPES = ["financial", "bookings", "facilities", "inventory", "ceremony", "patrons", "maintenance"] as const;
const ALLOWED_FORMATS = ["csv"] as const;

type ReportType   = typeof ALLOWED_TYPES[number];
type ReportFormat = typeof ALLOWED_FORMATS[number];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; format: string }> }
) {
  const auth = await authorizeApi("reports:view");
  if (auth instanceof Response) return auth;

  const { type, format: fmt } = await params;

  if (!(ALLOWED_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }
  if (!(ALLOWED_FORMATS as readonly string[]).includes(fmt)) {
    return NextResponse.json({ error: "Invalid format. Supported: csv" }, { status: 400 });
  }

  const sp = req.nextUrl.searchParams;
  const period = (sp.get("period") ?? "6m") as ReportPeriod;
  const from   = sp.get("from") ?? undefined;
  const to     = sp.get("to")   ?? undefined;
  const range  = resolveDateRange(period, from, to);

  let csvContent: string;
  const reportType = type as ReportType;

  switch (reportType) {
    case "financial": {
      const data = await getFinancialReport(range);
      csvContent = financialToCSV(data);
      break;
    }
    case "bookings": {
      const data = await getBookingReport(range);
      csvContent = bookingsToCSV(data);
      break;
    }
    case "facilities": {
      const data = await getFacilitiesReport(range);
      csvContent = facilitiesToCSV(data);
      break;
    }
    case "inventory": {
      const data = await getInventoryReport(range);
      csvContent = inventoryToCSV(data);
      break;
    }
    case "ceremony": {
      const data = await getCeremonyReport(range);
      csvContent = ceremonyToCSV(data);
      break;
    }
    case "patrons": {
      const data = await getPatronsReport(range);
      csvContent = patronsToCSV(data);
      break;
    }
    case "maintenance": {
      const data = await getMaintenanceReport(range);
      csvContent = maintenanceToCSV(data);
      break;
    }
    default:
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }

  const filename = `${reportType}-report-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
