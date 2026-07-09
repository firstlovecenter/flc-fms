/**
 * CSV generation utilities for each report domain.
 * Pure string-based — no external libraries.
 */

function cell(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [headers.map(cell), ...rows.map((r) => r.map(cell))].map((r) => r.join(",")).join("\n");
}

// ── Financial ─────────────────────────────────────────────────────────────────

export function financialToCSV(data: {
  monthly: { label: string; income: number; expenses: number; bookingRevenue: number }[];
  incomeByCategory:  { category: string; total: number; count: number }[];
  expenseByCategory: { category: string; total: number; count: number }[];
}): string {
  const monthly = toCSV(
    ["Month", "Income (GH₵)", "Expenses (GH₵)", "Booking Revenue (GH₵)", "Net (GH₵)"],
    data.monthly.map((m) => [
      m.label,
      m.income.toFixed(2),
      m.expenses.toFixed(2),
      m.bookingRevenue.toFixed(2),
      (m.income + m.bookingRevenue - m.expenses).toFixed(2),
    ])
  );

  const incCat = toCSV(
    ["Income Category", "Total (GH₵)", "Records"],
    data.incomeByCategory.map((c) => [c.category, c.total.toFixed(2), c.count])
  );

  const expCat = toCSV(
    ["Expense Category", "Total (GH₵)", "Records"],
    data.expenseByCategory.map((c) => [c.category, c.total.toFixed(2), c.count])
  );

  return `MONTHLY SUMMARY\n${monthly}\n\nINCOME BY CATEGORY\n${incCat}\n\nEXPENSES BY CATEGORY\n${expCat}`;
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export function bookingsToCSV(data: {
  statusBreakdown:   { status: string; count: number; revenue: number }[];
  facilityBreakdown: { facilityName: string; count: number; revenue: number }[];
  categoryBreakdown: { category: string; count: number; revenue: number }[];
  avgValue: number;
}): string {
  const status = toCSV(
    ["Status", "Count", "Revenue (GH₵)"],
    data.statusBreakdown.map((s) => [s.status, s.count, s.revenue.toFixed(2)])
  );

  const facility = toCSV(
    ["Facility", "Bookings", "Revenue (GH₵)"],
    data.facilityBreakdown.map((f) => [f.facilityName, f.count, f.revenue.toFixed(2)])
  );

  const category = toCSV(
    ["Category", "Count", "Revenue (GH₵)"],
    data.categoryBreakdown.map((c) => [c.category, c.count, c.revenue.toFixed(2)])
  );

  return `BY STATUS\n${status}\n\nBY FACILITY\n${facility}\n\nBY CATEGORY\n${category}\n\nAverage Booking Value: GH₵${data.avgValue.toFixed(2)}`;
}

// ── Facilities ────────────────────────────────────────────────────────────────

export function facilitiesToCSV(data: {
  id: string;
  name: string;
  capacity: number;
  isActive: boolean;
  underMaintenance: boolean;
  bookings: number;
  revenue: number;
  utilizationPct: number;
  maintenanceCount: number;
}[]): string {
  return toCSV(
    ["Facility", "Capacity", "Active", "Under Maintenance", "Bookings", "Revenue (GH₵)", "Utilization %", "Maintenance Requests"],
    data.map((f) => [
      f.name,
      f.capacity,
      f.isActive ? "Yes" : "No",
      f.underMaintenance ? "Yes" : "No",
      f.bookings,
      f.revenue.toFixed(2),
      f.utilizationPct,
      f.maintenanceCount,
    ])
  );
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export function inventoryToCSV(data: {
  totalItems: number;
  checkedOut: number;
  overdue: number;
  underMaintenance: number;
  conditionBreakdown: { condition: string; count: number }[];
  statusBreakdown:    { status: string; count: number }[];
  checkoutByMonth:    { label: string; count: number }[];
}): string {
  const summary = toCSV(
    ["Metric", "Value"],
    [
      ["Total Items", data.totalItems],
      ["Checked Out", data.checkedOut],
      ["Overdue", data.overdue],
      ["Under Maintenance", data.underMaintenance],
    ]
  );

  const condition = toCSV(
    ["Condition", "Count"],
    data.conditionBreakdown.map((c) => [c.condition, c.count])
  );

  const status = toCSV(
    ["Status", "Count"],
    data.statusBreakdown.map((s) => [s.status, s.count])
  );

  const monthly = toCSV(
    ["Month", "Checkouts"],
    data.checkoutByMonth.map((m) => [m.label, m.count])
  );

  return `SUMMARY\n${summary}\n\nBY CONDITION\n${condition}\n\nBY STATUS\n${status}\n\nMONTHLY CHECKOUTS\n${monthly}`;
}

// ── Ceremony ──────────────────────────────────────────────────────────────────

export function ceremonyToCSV(data: {
  total: number;
  pending: number;
  activated: number;
  used: number;
  expired: number;
  conversionRate: number;
  statusBreakdown: { status: string; count: number }[];
  typeBreakdown:   { type: string; count: number }[];
  revenueByVenue:  { facilityId: string; facilityName: string; totalPaid: number; count: number }[];
  totalRevenue: number;
}): string {
  const summary = toCSV(
    ["Metric", "Value"],
    [
      ["Total Codes", data.total],
      ["Pending", data.pending],
      ["Activated", data.activated],
      ["Used (Booked)", data.used],
      ["Expired", data.expired],
      ["Conversion Rate %", data.conversionRate],
      ["Total Revenue Collected", data.totalRevenue],
    ]
  );

  const type = toCSV(
    ["Ceremony Type", "Count"],
    data.typeBreakdown.map((t) => [t.type, t.count])
  );

  const venue = toCSV(
    ["Venue", "Codes", "Amount Paid"],
    data.revenueByVenue.map((v) => [v.facilityName, v.count, v.totalPaid])
  );

  return `SUMMARY\n${summary}\n\nBY CEREMONY TYPE\n${type}\n\nBY VENUE\n${venue}`;
}

// ── Patrons ───────────────────────────────────────────────────────────────────

export function patronsToCSV(data: {
  total: number;
  newInRange: number;
  verified: number;
  unverified: number;
  activeInRange: number;
  registrationsByMonth: { label: string; count: number }[];
}): string {
  const summary = toCSV(
    ["Metric", "Value"],
    [
      ["Total Patrons", data.total],
      ["New in Period", data.newInRange],
      ["Verified", data.verified],
      ["Unverified", data.unverified],
      ["Active in Period", data.activeInRange],
    ]
  );

  const monthly = toCSV(
    ["Month", "New Registrations"],
    data.registrationsByMonth.map((m) => [m.label, m.count])
  );

  return `SUMMARY\n${summary}\n\nREGISTRATIONS BY MONTH\n${monthly}`;
}

// ── Maintenance ───────────────────────────────────────────────────────────────

export function maintenanceToCSV(data: {
  statusBreakdown:    { status: string; count: number }[];
  priorityBreakdown:  { priority: string; count: number }[];
  totalMaintenanceCost: number;
  avgResolutionHours: number;
  resolvedCount: number;
}): string {
  const status = toCSV(
    ["Status", "Count"],
    data.statusBreakdown.map((s) => [s.status, s.count])
  );

  const priority = toCSV(
    ["Priority", "Count"],
    data.priorityBreakdown.map((p) => [p.priority, p.count])
  );

  const summary = toCSV(
    ["Metric", "Value"],
    [
      ["Total Maintenance Cost (GH₵)", data.totalMaintenanceCost.toFixed(2)],
      ["Avg Resolution Time (hrs)", data.avgResolutionHours],
      ["Resolved in Period", data.resolvedCount],
    ]
  );

  return `BY STATUS\n${status}\n\nBY PRIORITY\n${priority}\n\nSUMMARY\n${summary}`;
}

// ── Savings ───────────────────────────────────────────────────────────────────

export function savingsToCSV(data: {
  rows: {
    createdAt: Date;
    type: "DEPOSIT" | "WITHDRAWAL";
    narration: string;
    createdByName: string;
    amount: number;
    balanceAfter: number;
  }[];
  deposits: number;
  withdrawals: number;
  netSavings: number;
}): string {
  const statement = toCSV(
    ["Date", "Type", "Narration", "Recorded By", "Amount (GH₵)", "Balance (GH₵)"],
    data.rows.map((r) => [
      r.createdAt.toISOString().slice(0, 10),
      r.type === "DEPOSIT" ? "Transfer In" : "Transfer Out",
      r.narration,
      r.createdByName,
      (r.type === "DEPOSIT" ? r.amount : -r.amount).toFixed(2),
      r.balanceAfter.toFixed(2),
    ])
  );

  const summary = toCSV(
    ["Metric", "Value (GH₵)"],
    [
      ["Total Transferred In", data.deposits.toFixed(2)],
      ["Total Transferred Out", data.withdrawals.toFixed(2)],
      ["Savings Balance", data.netSavings.toFixed(2)],
    ]
  );

  return `SAVINGS STATEMENT\n${statement}\n\nSUMMARY\n${summary}`;
}
