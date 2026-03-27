import { NextRequest, NextResponse } from "next/server";
import { runScheduledReports } from "@/lib/reports/scheduled";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lastMonth = subMonths(new Date(), 1);
  const from = startOfMonth(lastMonth);
  const to   = endOfMonth(lastMonth);

  const result = await runScheduledReports("MONTHLY", { from, to });
  return NextResponse.json({ ok: true, ...result });
}
