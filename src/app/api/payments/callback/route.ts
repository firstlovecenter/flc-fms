/**
 * Payment Callback / Redirect Handler
 *
 * Paystack and Flutterwave redirect the user's browser HERE after the
 * checkout flow (success or failure).  They both append query params
 * that identify the transaction; we look up the payment, then redirect
 * the patron to their bookings page with an appropriate toast param.
 *
 * Webhook handlers (src/app/api/webhooks/*) do the actual server-side
 * verification and DB update — this route only handles the browser redirect.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  /* ── Paystack ── sends ?reference=<payment.id> ──────────────────────── */
  const paystackRef = searchParams.get("reference") ?? searchParams.get("trxref");

  /* ── Flutterwave ── sends ?tx_ref=<payment.id>&status=successful ─────── */
  const flwRef    = searchParams.get("tx_ref");
  const flwStatus = searchParams.get("status"); // "successful" | "failed" | "cancelled"

  const paymentRef = paystackRef ?? flwRef;

  if (!paymentRef) {
    // Unknown provider or tampered URL — send to generic patron landing
    return NextResponse.redirect(new URL("/patron/bookings?status=unknown", req.url));
  }

  // Find payment to get the campus subdomain for the correct redirect host
  const payment = await prisma.payment.findUnique({
    where: { id: paymentRef },
    select: {
      status:   true,
      booking:  { select: { id: true } }}});

  if (!payment) {
    return NextResponse.redirect(new URL("/patron/bookings?status=not_found", req.url));
  }

  /*
   * At this point the webhook may not have fired yet (or may arrive
   * moments later).  We rely on the webhook for ground truth; here we
   * just redirect with a `processing` param so the UI can show a
   * "Payment received, please wait…" message.
   */

  const isSuccess =
    payment.status === "PAID" ||
    flwStatus === "successful" ||
    // Paystack does not send status in redirect — assume success unless already failed
    (paystackRef && payment.status !== "FAILED");

  const statusParam = isSuccess ? "processing" : "failed";

  // Determine patron portal URL
  const origin = req.nextUrl.origin; // fallback: same host (works in dev)
  const destination = new URL(
    `/patron/bookings/${payment.booking.id}?payment=${statusParam}`,
    origin
  );

  return NextResponse.redirect(destination);
}
