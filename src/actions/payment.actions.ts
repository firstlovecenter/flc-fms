"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff, requirePatron } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";
import { encrypt, decrypt } from "@/lib/crypto";
import { auditLog } from "@/lib/audit";

// ── Configure gateway (Super Admin only) ─────────────────────────────────────

const ConfigSchema = z.object({
  provider:      z.enum(["PAYSTACK", "FLUTTERWAVE", "HUBTEL"]),
  publicKey:     z.string().min(10),
  secretKey:     z.string().min(10),
  webhookSecret: z.string().optional()});

export async function configurePaymentGateway(data: z.infer<typeof ConfigSchema>) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") return { error: "Unauthorized" };

  const validated = ConfigSchema.parse(data);

  // Try to find existing config, or create a new one
  const existingConfig = await prisma.paymentConfig.findFirst({});
  
  if (existingConfig) {
    await prisma.paymentConfig.update({
      where: { id: existingConfig.id },
      data: {
        provider:      validated.provider,
        publicKey:     validated.publicKey,
        secretKey:     encrypt(validated.secretKey),
        webhookSecret: validated.webhookSecret ? encrypt(validated.webhookSecret) : null
      }
    });
  } else {
    await prisma.paymentConfig.create({
      data: {
        provider:      validated.provider,
        publicKey:     validated.publicKey,
        secretKey:     encrypt(validated.secretKey),
        webhookSecret: validated.webhookSecret ? encrypt(validated.webhookSecret) : null
      }
    });
  }

  auditLog({ userId: session.sub, action: "CONFIGURE_PAYMENT_GATEWAY", entity: "PaymentConfig", entityId: "payment-config" });
  revalidatePath("/payments");
  return { success: true };
}

// ── Initiate payment (patron) ─────────────────────────────────────────────────

export async function initiatePayment(bookingId: string) {
  const session  = await requirePatron();  const booking = await prisma.booking.findFirstOrThrow({
    where: { id: bookingId, patronId: session.sub },
    include: { patron: true }});

  if (booking.paymentStatus === "PAID") return { error: "Booking already paid." };

  // TODO: Resolve campus context for payment config lookup
  const config = await prisma.paymentConfig.findFirst({});
  if (!config?.isActive) return { error: "Campus payment gateway not configured." };

  const secretKey = decrypt(config.secretKey);

  // Create a pending payment record
  const payment = await prisma.payment.create({
    data: {
      bookingId,
      patronId: session.sub,
      amount:   booking.totalAmount,
      provider: config.provider,
      status:   "PENDING"}});

  // Generate provider-specific checkout URL
  let checkoutUrl: string;

  if (config.provider === "PAYSTACK") {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"},
      body: JSON.stringify({
        email:      booking.patron!.email,
        amount:     Math.round(Number(booking.totalAmount) * 100), // kobo
        reference:  payment.id,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback`,
        metadata: { bookingId } })});
    const data = await res.json();
    if (!data.status) return { error: "Failed to initialise payment." };
    checkoutUrl = data.data.authorization_url;

    await prisma.payment.update({ where: { id: payment.id }, data: { providerRef: payment.id } });

  } else if (config.provider === "FLUTTERWAVE") {
    const res = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"},
      body: JSON.stringify({
        tx_ref:       payment.id,
        amount:       Number(booking.totalAmount),
        currency:     "GHS",
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback`,
        customer:     { email: booking.patron!.email, name: booking.patron!.name },
        customizations: { title: "CFMS Booking Payment" }})});
    const data = await res.json();
    checkoutUrl = data.data?.link ?? "";

  } else {
    // Hubtel
    const res = await fetch("https://payproxyapi.hubtel.com/items/initiate", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(secretKey).toString("base64")}`,
        "Content-Type": "application/json"},
      body: JSON.stringify({
        totalAmount:    Number(booking.totalAmount),
        description:    `Booking: ${booking.title}`,
        clientReference: payment.id,
        callbackUrl:    `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/hubtel`,
        returnUrl:      `${process.env.NEXT_PUBLIC_APP_URL}/patron/bookings`,
        cancellationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/patron/bookings`,
        merchantAccountNumber: config.publicKey})});
    const data = await res.json();
    checkoutUrl = data.data?.checkoutDirectUrl ?? "";
  }

  auditLog({ userId: session.sub, action: "INITIATE_PAYMENT", entity: "Payment", entityId: payment.id });
  return { success: true, checkoutUrl, paymentId: payment.id };
}

// ── Get campus transactions (FM view) ────────────────────────────────────────

export async function getCampusTransactions(page = 1) {
  await requireStaff("FACILITY_MANAGER");  const take = 20;

  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where: {},
      include: { booking: { select: { title: true } }, patron: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take}),
    prisma.payment.count({ where: {} }),
  ]);

  return { payments, total, page, pages: Math.ceil(total / take) };
}

// ── Get campus config (public key only — for frontend) ───────────────────────

export async function getCampusPaymentPublicKey() {  const config = await prisma.paymentConfig.findFirst({
    where: {},
    select: { provider: true, publicKey: true, isActive: true }});
  return config;
}
