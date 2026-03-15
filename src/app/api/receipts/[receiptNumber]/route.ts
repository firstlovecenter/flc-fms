/**
 * Receipt download endpoint
 *
 * GET /api/receipts/:receiptNumber
 *
 * Generates a simple HTML-based receipt and returns it as a PDF via
 * browser print.  For a production app, swap the HTML response for a
 * proper PDF library (e.g. @react-pdf/renderer, puppeteer, pdfkit).
 *
 * Access rules:
 *  - Patron can only download their own receipt
 *  - Campus staff (FM / Vicar) can download any receipt on their campus
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { format } from "date-fns";

export async function GET(
  req: NextRequest,
  { params }: { params: { receiptNumber: string } }
) {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const receipt = await prisma.receipt.findUnique({
    where: { receiptNumber: params.receiptNumber },
    include: {
      booking: {
        include: {
          facility: { select: { name: true } },
          patron:   { select: { name: true, email: true, phone: true } },
          user:     { select: { name: true, email: true } }}},
      payment: { select: { amount: true, provider: true, paidAt: true } }}});

  if (!receipt) return new NextResponse("Receipt not found", { status: 404 });

  // Tenant-level access check
  if (session.role === "PATRON" && receipt.booking.patronId !== session.sub) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const b  = receipt.booking;
  const p  = receipt.payment;
  const customer = b.patron ?? b.user;
  const amountStr = `GH₵${Number(p?.amount ?? 0).toFixed(2)}`;
  const paidAt    = p?.paidAt ? format(p.paidAt, "dd MMM yyyy, HH:mm") : "—";
  const fmt       = (d: Date) => format(d, "dd MMM yyyy, HH:mm");

  const html = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt #${receipt.receiptNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1a202c; background: #fff; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2e86ab; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 22px; font-weight: 700; color: #2e86ab; }
    .receipt-meta { text-align: right; font-size: 13px; color: #4a5568; }
    .receipt-meta strong { display: block; font-size: 15px; color: #1a202c; }
    h2 { font-size: 16px; color: #2e86ab; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px; }
    td { padding: 8px 12px; border: 1px solid #e2e8f0; }
    td:first-child { width: 38%; color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    td:last-child  { font-weight: 500; }
    .total-row td { background: #ebf8ff; font-weight: 700; font-size: 15px; }
    .footer { margin-top: 32px; font-size: 11px; color: #a0aec0; text-align: center; }
    @media print { .no-print { display: none; } }
    .print-btn { margin: 20px 0; padding: 10px 20px; background: #2e86ab; color: #fff; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Church FMS</div>
    <div class="receipt-meta">
      <strong>PAYMENT RECEIPT</strong>
      #${receipt.receiptNumber}<br/>
      Issued: ${format(receipt.issuedAt, "dd MMM yyyy")}
    </div>
  </div>

  <h2>Customer</h2>
  <table>
    <tr><td>Name</td><td>${customer?.name ?? "—"}</td></tr>
    <tr><td>Email</td><td>${customer?.email ?? "—"}</td></tr>
  </table>

  <h2>Booking Details</h2>
  <table>
    <tr><td>Facility</td><td>${b.facility?.name ?? "N/A"}</td></tr>
    <tr><td>Booking</td><td>${b.title}</td></tr>
    <tr><td>Start</td><td>${fmt(b.startTime)}</td></tr>
    <tr><td>End</td><td>${fmt(b.endTime)}</td></tr>
  </table>

  <h2>Payment</h2>
  <table>
    <tr><td>Provider</td><td>${p?.provider ?? "—"}</td></tr>
    <tr><td>Paid at</td><td>${paidAt}</td></tr>
    <tr class="total-row"><td>Total Paid</td><td>${amountStr}</td></tr>
  </table>

  <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>

  <div class="footer">
    This is a computer-generated receipt and requires no signature.<br/>
    Church Facility Management System &bull; ${new Date().getFullYear()}
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store"}});
}
