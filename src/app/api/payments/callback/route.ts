/**
 * Payment Callback / Redirect Handler
 *
 * Paystack redirects the user's browser HERE after the checkout flow
 * (success or failure). It appends query params that identify the
 * transaction; we look up the payment, then redirect the patron to
 * their bookings page with an appropriate toast param.
 *
 * Webhook handlers (src/app/api/webhooks/*) do the actual server-side
 * verification and DB update — this route only handles the browser redirect.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  /* ── Paystack ── sends ?reference=<payment.id> ──────────────────────── */
  const paymentRef = searchParams.get("reference") ?? searchParams.get("trxref");

  if (!paymentRef) {
    return NextResponse.redirect(new URL("/patron/bookings?payment=unknown", req.url));
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentRef },
    select: {
      status:   true,
      booking:  { select: { id: true } },
    },
  });

  if (!payment) {
    return NextResponse.redirect(new URL("/patron/bookings?payment=not_found", req.url));
  }

  const statusParam = payment.status === "PAID" ? "success" : "processing";

  const origin = req.nextUrl.origin;
  const destination = new URL(
    `/patron/bookings/${payment.booking.id}?payment=${statusParam}`,
    origin,
  );

  return NextResponse.redirect(destination);
}
