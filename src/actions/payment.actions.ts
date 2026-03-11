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
  provider:      z.enum(["PAYSTACK", "HUBTEL"]),
  publicKey:     z.string().min(10),
  secretKey:     z.string().min(10),
  webhookSecret: z.string().optional(),
});

export async function configurePaymentGateway(data: z.infer<typeof ConfigSchema>) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") return { error: "Unauthorized" };

  const validated = ConfigSchema.parse(data);

  const existingConfig = await prisma.paymentConfig.findFirst({
    where: { provider: validated.provider },
  });

  if (existingConfig) {
    await prisma.paymentConfig.update({
      where: { id: existingConfig.id },
      data: {
        publicKey:     validated.publicKey,
        secretKey:     encrypt(validated.secretKey),
        webhookSecret: validated.webhookSecret ? encrypt(validated.webhookSecret) : null,
      },
    });
  } else {
    await prisma.paymentConfig.create({
      data: {
        provider:      validated.provider,
        publicKey:     validated.publicKey,
        secretKey:     encrypt(validated.secretKey),
        webhookSecret: validated.webhookSecret ? encrypt(validated.webhookSecret) : null,
      },
    });
  }

  auditLog({ userId: session.sub, action: "CONFIGURE_PAYMENT_GATEWAY", entity: "PaymentConfig", entityId: validated.provider });
  revalidatePath("/payments");
  return { success: true };
}

// ── Toggle gateway on/off (Super Admin only) ─────────────────────────────────

export async function togglePaymentGateway(provider: "PAYSTACK" | "HUBTEL", active: boolean) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") return { error: "Unauthorized" };

  const config = await prisma.paymentConfig.findFirst({ where: { provider } });
  if (!config) return { error: "Gateway not configured yet." };

  await prisma.paymentConfig.update({
    where: { id: config.id },
    data: { isActive: active },
  });

  auditLog({ userId: session.sub, action: active ? "ENABLE_GATEWAY" : "DISABLE_GATEWAY", entity: "PaymentConfig", entityId: config.id });
  revalidatePath("/payments");
  return { success: true };
}

// ── Initiate payment (patron) ─────────────────────────────────────────────────

export async function initiatePayment(bookingId: string) {
  const session = await requirePatron();
  const booking = await prisma.booking.findFirstOrThrow({
    where: { id: bookingId, patronId: session.sub },
    include: { patron: true },
  });

  if (booking.paymentStatus === "PAID") return { error: "Booking already paid." };
  if (!["APPROVED", "COMPLETED"].includes(booking.status)) {
    return { error: "Booking must be approved before payment." };
  }

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
        patronId: session.sub,
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
    const data = await res.json();
    if (!data.status) return { error: "Failed to initialise payment." };
    checkoutUrl = data.data.authorization_url;
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
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/patron/bookings`,
        cancellationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/patron/bookings`,
        merchantAccountNumber: config.publicKey,
      }),
    });
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

// ── Get all configured gateways ──────────────────────────────────────────────

export async function getCampusPaymentConfigs() {
  const configs = await prisma.paymentConfig.findMany({
    select: { id: true, provider: true, publicKey: true, isActive: true, updatedAt: true },
    orderBy: { provider: "asc" },
  });
  return configs;
}
