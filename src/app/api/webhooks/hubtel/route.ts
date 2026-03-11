import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto";
import { sendPaymentReceiptEmail } from "@/lib/notifications/email";
import { notifyPaymentReceived } from "@/lib/notifications/sms";
import { auditLog } from "@/lib/audit";
import crypto from "crypto";
import { autoRecordPaymentIncome } from "@/actions/income.actions";

export async function POST(req: NextRequest) {
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Hubtel sends clientReference as the payment record id
  const clientReference: string | undefined =
    body.Data?.ClientReference ?? body.data?.ClientReference;

  if (!clientReference) {
    return NextResponse.json({ ok: false, message: "Missing clientReference" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id: clientReference },
    include: {
      booking: { include: { patron: true, facility: { select: { name: true } } } }}});

  if (!payment) {
    return NextResponse.json({ ok: false, message: "Payment not found" }, { status: 404 });
  }

  const config = await prisma.paymentConfig.findFirst({ where: { provider: "HUBTEL" } });

  // Verify webhook token if configured
  if (config?.webhookSecret) {
    const token     = req.headers.get("x-hubtel-token") ?? "";
    const expected  = decrypt(config.webhookSecret);
    if (token !== expected) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const status: string = body.Data?.Status ?? body.data?.Status ?? "";

  if (status === "Success" || status === "Approved") {
    if (payment.status === "PAID") {
      // Idempotent — already processed
      return NextResponse.json({ ok: true });
    }

    // Don't process if booking has been cancelled or rejected
    if (["CANCELLED", "REJECTED"].includes(payment.booking.status)) {
      return NextResponse.json({ ok: true });
    }

    // Only auto-approve if currently PENDING; preserve APPROVED/COMPLETED
    const bookingStatusUpdate = payment.booking.status === "PENDING" ? { status: "APPROVED" as const } : {};

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status:      "PAID",
          paidAt:      new Date(),
          providerRef: body.Data?.TransactionId ?? body.data?.TransactionId ?? clientReference,
          metadata:    body.Data ?? body.data,
        },
      }),
      prisma.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: "PAID", ...bookingStatusUpdate },
      }),
    ]);

    const receiptNumber = `RCP-${Date.now()}-${payment.id.slice(-4).toUpperCase()}`;
    await prisma.receipt.create({
      data: {
        bookingId:     payment.bookingId,
        paymentId:     payment.id,
        receiptNumber}});

    const patron = payment.booking.patron;
    if (patron?.phone) {
      await notifyPaymentReceived({
        phone:        patron.phone,
        amount:       Number(payment.amount),
        currency:     "GHS",
        bookingTitle: payment.booking.title});
    }
    if (patron?.email) {
      await sendPaymentReceiptEmail({
        to:           patron.email,
        name:         patron.name,
        receiptNumber,
        amount:       Number(payment.amount),
        bookingTitle: payment.booking.title});
    }

    auditLog({
      action:   "PAYMENT_RECEIVED",
      entity:   "Payment",
      entityId: payment.id,
      after:    { status: "PAID", provider: "HUBTEL", receiptNumber }});

    // Auto-record income
    await autoRecordPaymentIncome({
      bookingId:    payment.bookingId,
      bookingTitle: payment.booking.title,
      amount:       Number(payment.amount),
      provider:     "Hubtel",
      facilityName: payment.booking.facility?.name,
    });
  }

  return NextResponse.json({ ok: true });
}
