import { NextRequest, NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/guards";
import { getSavingsStatement } from "@/lib/finance";
import { savingsToCSV } from "@/lib/reports/csv";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi("finance:savings");
  if (auth instanceof Response) return auth;

  const sp = req.nextUrl.searchParams;
  const sType = sp.get("sType");
  const sFrom = sp.get("sFrom");
  const sTo   = sp.get("sTo");

  const type = sType === "DEPOSIT" || sType === "WITHDRAWAL" ? sType : undefined;
  const from = sFrom ? new Date(sFrom) : undefined;
  const to = sTo ? new Date(new Date(sTo).getTime() + 24 * 60 * 60 * 1000 - 1) : undefined;

  const statement = await getSavingsStatement({
    type,
    from: from && !isNaN(from.getTime()) ? from : undefined,
    to:   to   && !isNaN(to.getTime())   ? to   : undefined,
  });

  const csvContent = savingsToCSV(statement);
  const filename = `savings-statement-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
