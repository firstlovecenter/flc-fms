"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { redis, rateLimit } from "@/lib/redis";
import { decrypt } from "@/lib/crypto";
import { sendSMS } from "@/lib/notifications/sms";
import { auditLog } from "@/lib/audit";

const OTP_TTL = 300; // 5 minutes
const OTP_PREFIX = "pay_otp:";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Step 1: Lookup pending payments by phone ─────────────────────────────────

const LookupSchema = z.object({
  phone: z.string().min(9).max(20),
});

export async function lookupPendingPayments(data: z.infer<typeof LookupSchema>) {
  const { phone } = LookupSchema.parse(data);

  const { allowed } = await rateLimit(`pay_lookup:${phone}`, 10, 300);
  if (!allowed) return { error: "Too many attempts. Please try again later." };

  // Find patrons with this phone
  const patrons = await prisma.patron.findMany({
    where: { phone: { contains: phone.replace(/^\+/, "") } },
    select: { id: true, name: true, phone: true },
  });

  if (patrons.length === 0) return { results: [] };

  // Find approved/completed bookings with unpaid status for these patrons
  const bookings = await prisma.booking.findMany({
    where: {
      patronId: { in: patrons.map((p) => p.id) },
      status: { in: ["APPROVED", "COMPLETED"] },
      paymentStatus: "UNPAID",
      isBillingWaived: false,
      totalAmount: { gt: 0 },
    },
    select: {
      id: true,
      patronId: true,
    },
  });

  // Group by patron
  const grouped = patrons
    .map((p) => {
      const count = bookings.filter((b) => b.patronId === p.id).length;
      if (count === 0) return null;
      return {
        patronId: p.id,
        name: p.name,
        phoneMasked: maskPhone(p.phone ?? ""),
        pendingCount: count,
      };
    })
    .filter(Boolean);

  return { results: grouped };
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return "****";
  return phone.slice(0, 3) + "****" + phone.slice(-3);
}

// ── Step 2: Request OTP ──────────────────────────────────────────────────────

export async function requestPaymentOTP(patronId: string) {
  const { allowed } = await rateLimit(`pay_otp_req:${patronId}`, 3, 300);
  if (!allowed) return { error: "Too many OTP requests. Wait 5 minutes." };

  const patron = await prisma.patron.findUnique({
    where: { id: patronId },
    select: { phone: true, name: true },
  });
  if (!patron?.phone) return { error: "No phone number on file." };

  const otp = generateOTP();
  await redis.setex(`${OTP_PREFIX}${patronId}`, OTP_TTL, otp);

  await sendSMS({
    to: patron.phone,
    message: `[CFMS] Your payment verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`,
  });

  return { success: true, phoneMasked: maskPhone(patron.phone) };
}

// ── Step 3: Verify OTP and return booking details ────────────────────────────

const VerifySchema = z.object({
  patronId: z.string(),
  otp: z.string().length(6),
});

export async function verifyPaymentOTP(data: z.infer<typeof VerifySchema>) {
  const { patronId, otp } = VerifySchema.parse(data);

  const { allowed } = await rateLimit(`pay_otp_verify:${patronId}`, 5, 300);
  if (!allowed) return { error: "Too many attempts. Wait 5 minutes." };

  const savedOTP = await redis.get(`${OTP_PREFIX}${patronId}`);
  if (!savedOTP || savedOTP !== otp) return { error: "Invalid or expired code." };

  // OTP is valid — delete it (one-time use)
  await redis.del(`${OTP_PREFIX}${patronId}`);

  // Set a short-lived session token for this patron on this payment flow
  const sessionToken = `${patronId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  await redis.setex(`pay_session:${sessionToken}`, 1800, patronId); // 30 min

  // Return pending bookings with full details
  const bookings = await prisma.booking.findMany({
    where: {
      patronId,
      status: { in: ["APPROVED", "COMPLETED"] },
      paymentStatus: "UNPAID",
      isBillingWaived: false,
      totalAmount: { gt: 0 },
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      totalAmount: true,
      facility: { select: { name: true } },
    },
    orderBy: { startTime: "desc" },
  });

  return {
    success: true,
    sessionToken,
    bookings: bookings.map((b) => ({
      id: b.id,
      title: b.title,
      facilityName: b.facility?.name ?? "Items Booking",
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      amount: Number(b.totalAmount),
    })),
  };
}

// ── Step 4: Initiate payment from public page ────────────────────────────────

export async function initiatePublicPayment(bookingId: string, sessionToken: string) {
  const patronId = await redis.get(`pay_session:${sessionToken}`);
  if (!patronId) return { error: "Session expired. Please verify again." };

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      patronId,
      status: { in: ["APPROVED", "COMPLETED"] },
      paymentStatus: "UNPAID",
    },
    include: { patron: true },
  });

  if (!booking) return { error: "Booking not found or already paid." };

  const config = await prisma.paymentConfig.findFirst({ where: { isActive: true } });
  if (!config) return { error: "No active payment gateway configured." };

  const secretKey = decrypt(config.secretKey);

  // Reuse existing PENDING payment or create new one
  let payment = await prisma.payment.findUnique({ where: { bookingId } });
  if (payment?.status === "PAID") return { error: "Booking already paid." };

  if (payment) {
    payment = await prisma.payment.update({
      where: { id: payment.id },
      data: { provider: config.provider, amount: booking.totalAmount, status: "PENDING", providerRef: null },
    });
  } else {
    payment = await prisma.payment.create({
      data: {
        bookingId,
        patronId,
        amount: booking.totalAmount,
        provider: config.provider,
        status: "PENDING",
      },
    });
  }

  let checkoutUrl: string;

  if (config.provider === "PAYSTACK") {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: booking.patron!.email,
        amount: Math.round(Number(booking.totalAmount) * 100),
        reference: payment.id,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback`,
        metadata: { bookingId },
      }),
    });
    const d = await res.json();
    if (!d.status) return { error: "Failed to initialise payment." };
    checkoutUrl = d.data.authorization_url;
    await prisma.payment.update({ where: { id: payment.id }, data: { providerRef: payment.id } });
  } else {
    const res = await fetch("https://payproxyapi.hubtel.com/items/initiate", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(secretKey).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        totalAmount: Number(booking.totalAmount),
        description: `Booking: ${booking.title}`,
        clientReference: payment.id,
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/hubtel`,
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pay`,
        cancellationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pay`,
        merchantAccountNumber: config.publicKey,
      }),
    });
    const d = await res.json();
    checkoutUrl = d.data?.checkoutDirectUrl ?? "";
  }

  auditLog({
    action: "INITIATE_PUBLIC_PAYMENT",
    entity: "Payment",
    entityId: payment.id,
    after: { bookingId, patronId },
  });

  return { success: true, checkoutUrl, paymentId: payment.id };
}
