import { NextRequest, NextResponse } from "next/server";
import { runScheduledReports } from "@/lib/reports/scheduled";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lastYear = new Date().getFullYear() - 1;
  const from = new Date(lastYear, 0, 1);
  const to   = new Date(lastYear, 11, 31, 23, 59, 59);

  const result = await runScheduledReports("YEARLY", { from, to });
  return NextResponse.json({ ok: true, ...result });
}
