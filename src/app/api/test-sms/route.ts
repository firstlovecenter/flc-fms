import { NextRequest, NextResponse } from "next/server";
import { sendSMS } from "@/lib/notifications/sms";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const phone = req.nextUrl.searchParams.get("phone") ?? "0557382057";
  const success = await sendSMS({
    to: phone,
    message: `Test SMS from flc-fms via FLC Notify. Time: ${new Date().toISOString()}`,
  });

  return NextResponse.json({ success, phone });
}
