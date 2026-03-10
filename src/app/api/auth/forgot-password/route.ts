import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { redis, rateLimit } from "@/lib/redis";
import { randomInt } from "crypto";
import { sendSMS } from "@/lib/notifications/sms";
import { sendEmail } from "@/lib/notifications/email";

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

  // Store OTP in Redis with 15-minute TTL
  await redis.set(`pw-reset:${email}`, otp, "EX", 900);

  // Send OTP via SMS (primary) and email (secondary)
  if (user.phone) {
    await sendSMS({
      to: user.phone,
      message: `[Revival Mgmt] Your password reset code is: ${otp}. This code expires in 15 minutes. If you did not request this, please ignore.`,
    });
  }

  await sendEmail({
    to: email,
    subject: "Password Reset Code — Revival Mgmt",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1e3a5f;margin-bottom:16px">Password Reset</h2>
        <p>Hi ${user.name},</p>
        <p>Your password reset code is:</p>
        <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;margin:24px 0">
          <span style="font-size:2rem;font-weight:700;letter-spacing:0.2em;color:#1e3a5f">${otp}</span>
        </div>
        <p style="color:#6b7280;font-size:0.85rem">This code expires in 15 minutes. If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  });

  return successResponse;
}
