import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto";
import { sendPaymentReceiptEmail } from "@/lib/notifications/email";
import { notifyPaymentReceived } from "@/lib/notifications/sms";
import { auditLog } from "@/lib/audit";
import { autoRecordPaymentIncome } from "@/actions/income.actions";

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get("verif-hash") ?? "";

  let event: Record<string, any>;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const txRef = event.data?.tx_ref as string | undefined;
  if (!txRef) return NextResponse.json({ ok: false }, { status: 400 });

  const payment = await prisma.payment.findUnique({
    where: { providerRef: txRef },
    include: {
      booking: { include: { patron: true, facility: { select: { name: true } } } }}});
  if (!payment) return NextResponse.json({ ok: false }, { status: 404 });

  const config = await prisma.paymentConfig.findFirst({});
  if (!config?.webhookSecret) return NextResponse.json({ ok: false }, { status: 404 });

  // Flutterwave uses verif-hash = HMAC-SHA256 of body with webhook secret
  const webhookSecret = decrypt(config.webhookSecret);
  const expected = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");

  if (expected !== signature) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (event.event === "charge.completed" && event.data?.status === "successful") {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "PAID", paidAt: new Date(), metadata: event.data }}),
      prisma.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: "PAID", status: "APPROVED" }}),
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
      after:    { status: "PAID", receiptNumber }});

    // Auto-record income
    await autoRecordPaymentIncome({
      bookingId:    payment.bookingId,
      bookingTitle: payment.booking.title,
      amount:       Number(payment.amount),
      provider:     "Flutterwave",
      facilityName: payment.booking.facility?.name,
    });
  }

  return NextResponse.json({ ok: true });
}
