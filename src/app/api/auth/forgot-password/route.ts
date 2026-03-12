import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/redis";
import { randomInt } from "crypto";
import { sendSMS } from "@/lib/notifications/sms";
import { sendPasswordResetOtpEmail } from "@/lib/notifications/email";
import { setPasswordResetOtp } from "@/lib/password-reset";

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Rate limit: 5 requests per 15 minutes per email
  const { allowed } = await rateLimit(`forgot-pw:${email}`, 5, 900);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  // Always return success to avoid user enumeration
  const successResponse = NextResponse.json({ success: true });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return successResponse;

  // Generate 6-digit OTP
  const otp = randomInt(100000, 999999).toString();

  // Store OTP with Redis-first strategy and local fallback in development.
  await setPasswordResetOtp(email, otp, 900);

  // Notifications should not break password reset request handling.
  const notifyTasks: Promise<unknown>[] = [];
  if (user.phone) {
    notifyTasks.push(sendSMS({
      to: user.phone,
      message: `[Revival Mgmt] Your password reset code is: ${otp}. This code expires in 15 minutes. If you did not request this, please ignore.`,
    }));
  }

  notifyTasks.push(sendPasswordResetOtpEmail({
    to: email,
    name: user.name,
    otp,
    expiresMinutes: 15,
  }));

  await Promise.allSettled(notifyTasks);

  return successResponse;
}
