/**
 * Shared logic for generating and sending scheduled report emails.
 * Called by cron API routes (weekly / monthly / quarterly / yearly).
 */

import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/notifications/email";
import {
  getFinancialReport,
  getBookingReport,
  getFacilitiesReport,
  getInventoryReport,
  getCeremonyReport,
  getPatronsReport,
  getMaintenanceReport,
  type DateRange,
} from "@/actions/reports.actions";
import {
  financialToCSV,
  bookingsToCSV,
  facilitiesToCSV,
  inventoryToCSV,
  ceremonyToCSV,
  patronsToCSV,
  maintenanceToCSV,
} from "./csv";
import { Resend } from "resend";

type ReportType =
  | "FINANCIAL"
  | "BOOKINGS"
  | "FACILITIES"
  | "INVENTORY"
  | "CEREMONY"
  | "PATRONS"
  | "MAINTENANCE";

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const APP_NAME = "First Love Center Facility Management";
const APP_SHORT = "FLC FMS";
const FROM = process.env.EMAIL_FROM ?? "CFMS <noreply@platform.com>";

function esc(v: string) {
  return v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function kpiRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eceff4;color:#475569;font-size:13px;width:50%">${esc(label)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eceff4;color:#0f172a;font-size:13px;font-weight:700">${esc(value)}</td>
    </tr>
  `;
}

function money(v: number) {
  return `GH₵${v.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
}

interface ReportBlock {
  type: ReportType;
  kpis: Array<{ label: string; value: string }>;
  csvContent: string;
  filename: string;
}

async function buildReportBlock(type: ReportType, range: DateRange): Promise<ReportBlock> {
  const yyyymm = new Date().toISOString().slice(0, 7);
  const filename = `${type.toLowerCase()}-report-${yyyymm}.csv`;

  switch (type) {
    case "FINANCIAL": {
      const data = await getFinancialReport(range);
      const totalIncome   = data.monthly.reduce((s, m) => s + m.income + m.bookingRevenue, 0);
      const totalExpenses = data.monthly.reduce((s, m) => s + m.expenses, 0);
      return {
        type,
        kpis: [
          { label: "Total Income",   value: money(totalIncome) },
          { label: "Total Expenses", value: money(totalExpenses) },
          { label: "Net Balance",    value: money(totalIncome - totalExpenses) },
        ],
        csvContent: financialToCSV(data),
        filename,
      };
    }
    case "BOOKINGS": {
      const data = await getBookingReport(range);
      const total   = data.statusBreakdown.reduce((s, b) => s + b.count, 0);
      const revenue = data.statusBreakdown.reduce((s, b) => s + b.revenue, 0);
      return {
        type,
        kpis: [
          { label: "Total Bookings", value: String(total) },
          { label: "Total Revenue",  value: money(revenue) },
          { label: "Avg Value",      value: money(data.avgValue) },
        ],
        csvContent: bookingsToCSV(data),
        filename,
      };
    }
    case "FACILITIES": {
      const data = await getFacilitiesReport(range);
      const totalBookings = data.reduce((s, f) => s + f.bookings, 0);
      const totalRevenue  = data.reduce((s, f) => s + f.revenue, 0);
      return {
        type,
        kpis: [
          { label: "Facilities",     value: String(data.length) },
          { label: "Total Bookings", value: String(totalBookings) },
          { label: "Total Revenue",  value: money(totalRevenue) },
        ],
        csvContent: facilitiesToCSV(data),
        filename,
      };
    }
    case "INVENTORY": {
      const data = await getInventoryReport(range);
      return {
        type,
        kpis: [
          { label: "Total Items",  value: String(data.totalItems) },
          { label: "Checked Out",  value: String(data.checkedOut) },
          { label: "Overdue",      value: String(data.overdue) },
        ],
        csvContent: inventoryToCSV(data),
        filename,
      };
    }
    case "CEREMONY": {
      const data = await getCeremonyReport(range);
      return {
        type,
        kpis: [
          { label: "Total Codes",      value: String(data.total) },
          { label: "Completed",        value: String(data.used) },
          { label: "Conversion Rate",  value: `${data.conversionRate}%` },
        ],
        csvContent: ceremonyToCSV(data),
        filename,
      };
    }
    case "PATRONS": {
      const data = await getPatronsReport(range);
      return {
        type,
        kpis: [
          { label: "Total Patrons", value: String(data.total) },
          { label: "New in Period", value: String(data.newInRange) },
          { label: "Verified",      value: String(data.verified) },
        ],
        csvContent: patronsToCSV(data),
        filename,
      };
    }
    case "MAINTENANCE": {
      const data = await getMaintenanceReport(range);
      return {
        type,
        kpis: [
          { label: "Resolved in Period",  value: String(data.resolvedCount) },
          { label: "Maintenance Cost",    value: money(data.totalMaintenanceCost) },
          { label: "Avg Resolution",      value: `${data.avgResolutionHours}h` },
        ],
        csvContent: maintenanceToCSV(data),
        filename,
      };
    }
  }
}

function buildEmailHtml(
  recipientName: string,
  periodLabel: string,
  blocks: ReportBlock[]
): string {
  const blockSections = blocks.map((b) => `
    <div style="margin-bottom:24px">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.04em">${esc(b.type)} REPORT</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
        style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden">
        <tbody>
          ${b.kpis.map((k) => kpiRow(k.label, k.value)).join("")}
        </tbody>
      </table>
    </div>
  `).join("");

  return `
<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding:24px 12px;background:#f3f4f6">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:680px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr>
          <td style="padding:24px;background:#132a4a;color:#fff">
            <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;opacity:.8">${APP_SHORT}</div>
            <div style="margin-top:4px;font-size:18px;font-weight:700">${APP_NAME}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px">
            <div style="display:inline-block;padding:5px 10px;border-radius:999px;background:#f8f1df;color:#8a6a2f;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:14px">
              ${esc(periodLabel)} Report
            </div>
            <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a">Scheduled Report Delivery</h1>
            <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7">
              Hi ${esc(recipientName)}, here is your ${esc(periodLabel.toLowerCase())} summary from First Love Center. CSV attachments are included for each section.
            </p>
            ${blockSections}
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px">
              <tr>
                <td style="border-radius:10px;background:#1e3a5f">
                  <a href="${APP_URL}/reports" style="display:inline-block;padding:12px 18px;color:#fff;text-decoration:none;font-weight:700;font-size:14px">View Full Dashboard</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 24px 24px">
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 14px"/>
            <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6">
              This is an automated scheduled report from ${APP_NAME}. To manage your subscriptions, visit your portal settings.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>
`;
}

export type ScheduledFrequency = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export async function runScheduledReports(frequency: ScheduledFrequency, range: DateRange): Promise<{
  sent: number;
  errors: string[];
}> {
  const subscriptions = await prisma.reportSubscription.findMany({
    where: { frequency, isActive: true },
  });

  if (subscriptions.length === 0) return { sent: 0, errors: [] };

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const periodLabel = { WEEKLY: "Weekly", MONTHLY: "Monthly", QUARTERLY: "Quarterly", YEARLY: "Annual" }[frequency];

  let sent = 0;
  const errors: string[] = [];

  for (const sub of subscriptions) {
    try {
      const blocks = await Promise.all(
        (sub.reports as string[]).map((r) => buildReportBlock(r as ReportType, range))
      );

      const html = buildEmailHtml(sub.name, periodLabel, blocks);

      const attachments = blocks.map((b) => ({
        filename: b.filename,
        content:  Buffer.from(b.csvContent, "utf-8").toString("base64"),
      }));

      await resend.emails.send({
        from: FROM,
        to:   sub.email,
        subject: `${APP_SHORT} — ${periodLabel} Reports`,
        html,
        attachments,
      });

      sent++;
    } catch (err: any) {
      errors.push(`${sub.email}: ${err?.message ?? "Unknown error"}`);
    }
  }

  return { sent, errors };
}
