import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.EMAIL_FROM ?? "CFMS <noreply@platform.com>";

interface SendEmailParams {
  
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({  to, subject, html }: SendEmailParams) {
  let status = "FAILED";
  let providerRef: string | undefined;
  let error: string | undefined;

  try {
    const { data, error: resendError } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html});

    if (resendError) {
      error = resendError.message;
    } else {
      status = "SENT";
      providerRef = data?.id;
    }
  } catch (err: any) {
    error = err.message;
  }

  await prisma.notificationLog.create({
    data: {  type: "EMAIL", recipient: to, subject, body: html, status, provider: "RESEND", providerRef, error }});
}

// ── Templated senders ─────────────────────────────────────────────────────────

export async function sendBookingConfirmationEmail(params: {
  
  to: string;
  name: string;
  bookingTitle: string;
  facilityName: string;
  startTime: Date;
  endTime: Date;
  totalAmount: number;
}) {
  const fmt = (d: Date) =>
    d.toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" });

  await sendEmail({to: params.to,
    subject: `Booking Received: ${params.bookingTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1e3a5f">Booking Received</h2>
        <p>Hi ${params.name},</p>
        <p>Your booking request has been received and is pending approval.</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Facility</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${params.facilityName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>From</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${fmt(params.startTime)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>To</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${fmt(params.endTime)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Amount</strong></td><td style="padding:8px;border:1px solid #e2e8f0">GHS ${params.totalAmount.toFixed(2)}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">You will receive a confirmation once approved.</p>
      </div>`});
}

export async function sendPaymentReceiptEmail(params: {
  
  to: string;
  name: string;
  receiptNumber: string;
  amount: number;
  bookingTitle: string;
  receiptUrl?: string;
}) {
  await sendEmail({to: params.to,
    subject: `Payment Receipt #${params.receiptNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1e3a5f">Payment Confirmed</h2>
        <p>Hi ${params.name}, your payment has been received.</p>
        <p><strong>Receipt:</strong> #${params.receiptNumber}<br/>
           <strong>Booking:</strong> ${params.bookingTitle}<br/>
           <strong>Amount:</strong> GHS ${params.amount.toFixed(2)}</p>
        ${params.receiptUrl ? `<p><a href="${params.receiptUrl}" style="background:#2e86ab;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none">Download Receipt</a></p>` : ""}
      </div>`});
}

export async function sendExpenseNotificationEmail(params: {
  
  to: string;
  name: string;
  expenseTitle: string;
  amount: number;
  type: "SUBMITTED" | "APPROVED" | "REJECTED";
  reason?: string;
}) {
  const subject =
    params.type === "SUBMITTED"
      ? `New Expense Request: ${params.expenseTitle}`
      : `Expense ${params.type}: ${params.expenseTitle}`;

  await sendEmail({to: params.to,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1e3a5f">Expense ${params.type}</h2>
        <p>Hi ${params.name},</p>
        <p>The expense request <strong>${params.expenseTitle}</strong> (GHS ${params.amount.toFixed(2)}) has been <strong>${params.type}</strong>.</p>
        ${params.reason ? `<p><strong>Reason:</strong> ${params.reason}</p>` : ""}
      </div>`});
}

export async function sendBookingApprovedEmail(params: {
  
  to: string;
  name: string;
  bookingTitle: string;
  facilityName: string;
  startTime: Date;
  totalAmount: number;
  paymentUrl?: string;
}) {
  const fmt = (d: Date) => d.toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" });
  const paymentSection = params.paymentUrl && params.totalAmount > 0
    ? `<p style="margin-top:16px"><a href="${params.paymentUrl}" style="background:#2e86ab;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none">Make Payment — GHS ${params.totalAmount.toFixed(2)}</a></p>`
    : params.totalAmount === 0
      ? `<p style="color:#16a34a;font-weight:bold">Billing has been waived for this booking.</p>`
      : ``;
  await sendEmail({to: params.to,
    subject: `Booking Approved: ${params.bookingTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1e3a5f">Booking Approved ✓</h2>
        <p>Hi ${params.name}, your booking has been approved.</p>
        <p><strong>${params.bookingTitle}</strong> at ${params.facilityName}<br/>
           <strong>When:</strong> ${fmt(params.startTime)}<br/>
           <strong>Amount due:</strong> GHS ${params.totalAmount.toFixed(2)}</p>
        ${paymentSection}
      </div>`});
}

export async function sendBookingRejectedEmail(params: {
  
  to: string;
  name: string;
  bookingTitle: string;
  reason?: string;
}) {
  await sendEmail({to: params.to,
    subject: `Booking Not Approved: ${params.bookingTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1e3a5f">Booking Not Approved</h2>
        <p>Hi ${params.name}, unfortunately your booking request for <strong>${params.bookingTitle}</strong> was not approved.</p>
        ${params.reason ? `<p><strong>Reason:</strong> ${params.reason}</p>` : ""}
        <p>Please contact the facility manager if you have questions.</p>
      </div>`});
}

export async function sendMaintenanceOpenedEmail(params: {
  
  to: string;       // FM's email
  fmName: string;
  facilityName: string;
  requestTitle: string;
  priority: string;
  reportedBy: string;
}) {
  await sendEmail({to: params.to,
    subject: `[${params.priority}] Maintenance Request: ${params.requestTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1e3a5f">New Maintenance Request</h2>
        <p>Hi ${params.fmName},</p>
        <p>A new <strong>${params.priority}</strong> priority maintenance request has been submitted.</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Facility</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${params.facilityName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Request</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${params.requestTitle}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Reported By</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${params.reportedBy}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">Please review and assign this request in the CFMS portal.</p>
      </div>`});
}

export async function sendEventPublishedEmail(params: {
  
  to: string;
  patronName: string;
  eventTitle: string;
  facilityName: string;
  startTime: Date;
  endTime: Date;
}) {
  const fmt = (d: Date) => d.toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" });
  await sendEmail({to: params.to,
    subject: `Upcoming Event: ${params.eventTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1e3a5f">New Event at Your Campus</h2>
        <p>Hi ${params.patronName},</p>
        <p>A new event has been scheduled at your campus.</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Event</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${params.eventTitle}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Venue</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${params.facilityName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Start</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${fmt(params.startTime)}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>End</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${fmt(params.endTime)}</td></tr>
        </table>
      </div>`});
}

export async function sendPasswordChangedEmail(params: {
  to: string;
  name: string;
}) {
  await sendEmail({
    to: params.to,
    subject: "Your Password Has Been Changed",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1e3a5f">Password Changed</h2>
        <p>Hi ${params.name},</p>
        <p>Your CFMS password was successfully changed. If you did not make this change, please contact your administrator immediately.</p>
      </div>`,
  });
}

export async function sendStaffAppointmentEmail(params: {
  to: string;
  name: string;
  role: string;
  tempPassword: string;
  loginUrl: string;
}) {
  const roleLabel = params.role === "FACILITY_MANAGER" ? "Facility Manager" : "Vicar";
  await sendEmail({
    to: params.to,
    subject: `You've Been Appointed as ${roleLabel} — CFMS`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1e3a5f">Welcome to CFMS</h2>
        <p>Hi ${params.name},</p>
        <p>You have been appointed as <strong>${roleLabel}</strong> on the Church Facility Management System.</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Role</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${roleLabel}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0"><strong>Temporary Password</strong></td><td style="padding:8px;border:1px solid #e2e8f0"><code>${params.tempPassword}</code></td></tr>
        </table>
        <p style="margin-top:16px"><a href="${params.loginUrl}" style="background:#2e86ab;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none">Login Now</a></p>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">You will be asked to change your password on first login.</p>
      </div>`,
  });
}
