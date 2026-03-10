import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { redis, rateLimit } from "@/lib/redis";
import bcrypt from "bcryptjs";
import { notifyPasswordChanged } from "@/lib/notifications/sms";
import { sendPasswordChangedEmail } from "@/lib/notifications/email";

export async function POST(req: NextRequest) {
  let body: { email?: string; otp?: string; password?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const email = body.email?.trim().toLowerCase();
  const otp = body.otp?.trim();
  const password = body.password;

  if (!email || !otp || !password) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  // Rate limit: 10 attempts per 15 minutes per email
  const { allowed } = await rateLimit(`reset-pw:${email}`, 10, 900);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Please request a new code." }, { status: 429 });
  }

  // Verify OTP from Redis
  const storedOtp = await redis.get(`pw-reset:${email}`);
  if (!storedOtp || storedOtp !== otp) {
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
  }

  // Delete OTP after successful verification
  await redis.del(`pw-reset:${email}`);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Update password
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hash, mustChangePassword: false },
  });

  // Notify user
  if (user.phone) {
    await notifyPasswordChanged({ phone: user.phone, name: user.name });
  }
  await sendPasswordChangedEmail({ to: user.email, name: user.name });

  return NextResponse.json({ success: true });
}
