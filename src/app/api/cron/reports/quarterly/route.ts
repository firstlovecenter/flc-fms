import { NextRequest, NextResponse } from "next/server";
import { runScheduledReports } from "@/lib/reports/scheduled";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Covers the last 3 full months (previous quarter window)
  const now        = new Date();
  const threeBack  = subMonths(now, 3);
  const from = startOfMonth(threeBack);
  const to   = endOfMonth(subMonths(now, 1));

  const result = await runScheduledReports("QUARTERLY", { from, to });
  return NextResponse.json({ ok: true, ...result });
}
