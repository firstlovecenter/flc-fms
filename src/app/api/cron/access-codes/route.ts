import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { notifyAccessCode } from "@/lib/notifications/sms";

/**
 * Cron endpoint: sends access codes via SMS to bookers ~30 minutes before
 * their approved booking at a facility that has an access code.
 *
 * Call every 5 minutes (e.g. via Vercel Cron, external cron, or uptime monitor).
 * GET /api/cron/access-codes?secret=<CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Window: bookings starting 25–35 minutes from now
  const windowStart = new Date(now.getTime() + 25 * 60_000);
  const windowEnd = new Date(now.getTime() + 35 * 60_000);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "APPROVED",
      deletedAt: null,
      startTime: { gte: windowStart, lte: windowEnd },
      facility: {
        hasAccessCode: true,
        accessCode: { not: null },
      },
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      patron: { select: { phone: true } },
      user: { select: { phone: true } },
      facility: { select: { name: true, accessCode: true } },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const booking of bookings) {
    const phone = booking.patron?.phone ?? booking.user?.phone;
    if (!phone || !booking.facility?.accessCode) {
      skipped++;
      continue;
    }

    // Check if we already sent an access code SMS for this booking
    const alreadySent = await prisma.notificationLog.findFirst({
      where: {
        type: "SMS",
        recipient: phone,
        body: { contains: `access code for "${booking.title}"` },
        status: "SENT",
        sentAt: {
          // Only check within the last 24 hours to avoid false matches
          gte: new Date(now.getTime() - 24 * 60 * 60_000),
        },
      },
    });

    if (alreadySent) {
      skipped++;
      continue;
    }

    await notifyAccessCode({
      phone,
      bookingTitle: booking.title,
      facilityName: booking.facility.name,
      accessCode: booking.facility.accessCode,
      startTime: booking.startTime,
    });
    sent++;
  }

  return NextResponse.json({
    ok: true,
    processed: bookings.length,
    sent,
    skipped,
    window: { from: windowStart.toISOString(), to: windowEnd.toISOString() },
  });
}
