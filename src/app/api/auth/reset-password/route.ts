import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/redis";
import bcrypt from "bcryptjs";
import { notifyPasswordChanged } from "@/lib/notifications/sms";
import { sendPasswordChangedEmail } from "@/lib/notifications/email";
import { deletePasswordResetOtp, getPasswordResetOtp } from "@/lib/password-reset";

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

  // Verify OTP from Redis (with fallback store in development)
  const storedOtp = await getPasswordResetOtp(email);
  if (!storedOtp || storedOtp !== otp) {
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
  }

  // Delete OTP after successful verification
  await deletePasswordResetOtp(email);

  // Check User (staff) table first, then Patron table
  const user = await prisma.user.findUnique({ where: { email } });
  const patron = !user ? await prisma.patron.findUnique({ where: { email } }) : null;

  if (!user && !patron) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  // Update password
  const hash = await bcrypt.hash(password, 12);

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash, mustChangePassword: false },
    });

    if (user.phone) {
      await notifyPasswordChanged({ phone: user.phone, name: user.name });
    }
    await sendPasswordChangedEmail({ to: user.email, name: user.name });
  } else {
    await prisma.patron.update({
      where: { id: patron!.id },
      data: { passwordHash: hash, isVerified: true },
    });

    if (patron!.phone) {
      await notifyPasswordChanged({ phone: patron!.phone, name: patron!.name });
    }
    await sendPasswordChangedEmail({ to: patron!.email, name: patron!.name });
  }

  return NextResponse.json({ success: true });
}
