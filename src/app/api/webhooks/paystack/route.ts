import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto";
import { sendPaymentReceiptEmail } from "@/lib/notifications/email";
import { notifyPaymentReceived } from "@/lib/notifications/sms";
import { auditLog } from "@/lib/audit";
import { autoRecordPaymentIncome } from "@/actions/income.actions";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("x-paystack-signature") ?? "";

  let event: Record<string, any>;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const reference = event.data?.reference as string | undefined;
  if (!reference) return NextResponse.json({ ok: false }, { status: 400 });

  // Find the payment by providerRef (= payment.id we sent as reference)
  const payment = await prisma.payment.findUnique({
    where: { providerRef: reference },
    include: {
      booking: { include: { patron: true, facility: { select: { name: true } } } }}});

  if (!payment) return NextResponse.json({ ok: false }, { status: 404 });

  // Verify HMAC with campus-specific secret
  const config = await prisma.paymentConfig.findFirst({});
  if (!config) return NextResponse.json({ ok: false }, { status: 404 });

  const secretKey = decrypt(config.secretKey);
  const expected  = crypto.createHmac("sha512", secretKey).update(body).digest("hex");

  if (expected !== sig) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Handle events
  if (event.event === "charge.success") {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "PAID", paidAt: new Date(), metadata: event.data }}),
      prisma.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: "PAID", status: "APPROVED" }}),
    ]);

    // Issue receipt
    const receiptNumber = `RCP-${Date.now()}-${payment.id.slice(-4).toUpperCase()}`;
    const receipt = await prisma.receipt.create({
      data: {
        bookingId:     payment.bookingId,
        paymentId:     payment.id,
        receiptNumber}});

    // SMS receipt to patron (primary)
    const patron = payment.booking.patron;
    if (patron?.phone) {
      await notifyPaymentReceived({
        phone:        patron.phone,
        amount:       Number(payment.amount),
        currency:     "GHS",
        bookingTitle: payment.booking.title});
    }
    // Email receipt to patron
    if (patron?.email) {
      await sendPaymentReceiptEmail({
        to:            patron.email,
        name:          patron.name,
        receiptNumber,
        amount:        Number(payment.amount),
        bookingTitle:  payment.booking.title});
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
      provider:     "Paystack",
      facilityName: payment.booking.facility?.name,
    });
  }

  return NextResponse.json({ ok: true });
}
