import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

/**
 * Cron endpoint: auto-completes APPROVED bookings whose endTime has passed.
 *
 * Call every 5–10 minutes (e.g. via Vercel Cron, external cron, or uptime monitor).
 * GET /api/cron/close-bookings?secret=<CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const querySecret = req.nextUrl.searchParams.get("secret");
  const headerSecret = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!expected || (querySecret !== expected && headerSecret !== expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: "APPROVED",
      deletedAt: null,
      endTime: { lt: now },
    },
    select: { id: true },
  });

  if (expiredBookings.length === 0) {
    return NextResponse.json({ ok: true, closed: 0 });
  }

  const ids = expiredBookings.map((b) => b.id);

  await prisma.booking.updateMany({
    where: { id: { in: ids } },
    data: { status: "COMPLETED" },
  });

  return NextResponse.json({ ok: true, closed: ids.length });
}
