import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.EMAIL_FROM ?? "CFMS <noreply@platform.com>";
const APP_NAME = "First Love Center Facility Management";
const APP_SHORT = "FLC FMS";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@platform.com";
const APP_LOGO_URL = `${APP_URL}/fl-logo-white.webp`;
const APP_LOGO_ALT = APP_SHORT;

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

function esc(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(amount: number) {
  return `GHS ${amount.toFixed(2)}`;
}

function dt(value: Date) {
  return value.toLocaleString("en-GH", { dateStyle: "full", timeStyle: "short" });
}

function lineItems(items: Array<{ label: string; value: string }>) {
  return items
    .map(
      (item) => `
        <tr>
          <td class="email-table-label" style="padding:10px 12px;border-bottom:1px solid #eceff4;color:#475569;font-size:14px;width:38%;vertical-align:top">${esc(item.label)}</td>
          <td class="email-table-value" style="padding:10px 12px;border-bottom:1px solid #eceff4;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top">${item.value}</td>
        </tr>
      `,
    )
    .join("");
}

function bulletList(items: string[]) {
  return `
    <ul style="margin:0;padding-left:18px;color:#334155;font-size:14px;line-height:1.7">
      ${items.map((item) => `<li style="margin:0 0 6px">${item}</li>`).join("")}
    </ul>
  `;
}

function renderEmailTemplate(input: {
  preheader: string;
  badge?: string;
  title: string;
  intro: string;
  rows?: Array<{ label: string; value: string }>;
  detailsHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  ctaAltText?: string;
  footerNote?: string;
}) {
  const rowsTable = input.rows?.length
    ? `
      <table class="email-table" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #e2e8f0;border-radius:12px;border-collapse:separate;border-spacing:0;background:#ffffff;overflow:hidden;margin-top:14px">
        <tbody>${lineItems(input.rows)}</tbody>
      </table>
    `
    : "";

  const cta = input.ctaLabel && input.ctaUrl
    ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px">
        <tr>
          <td style="border-radius:10px;background:#1e3a5f">
            <a href="${input.ctaUrl}" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px">${esc(input.ctaLabel)}</a>
          </td>
        </tr>
      </table>
      ${input.ctaAltText ? `<p class="email-muted" style="margin:10px 0 0;color:#64748b;font-size:12px;line-height:1.6">${esc(input.ctaAltText)}</p>` : ""}
    `
    : "";

  const logoBlock = APP_LOGO_URL
    ? `
      <td style="vertical-align:middle;text-align:right">
        <img src="${APP_LOGO_URL}" alt="${esc(APP_LOGO_ALT)}" style="max-height:36px;max-width:130px;width:auto;height:auto;display:inline-block" />
      </td>
    `
    : "";

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${esc(input.title)}</title>
  </head>
  <body class="email-bg" style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(input.preheader)}</span>
    <table class="email-bg" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding:24px 12px;background:#f3f4f6">
      <tr>
        <td align="center">
          <table class="email-card" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:680px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
            <tr>
              <td class="email-header" style="padding:24px;background:#132a4a;color:#ffffff">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="vertical-align:middle">
                      <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8">${APP_SHORT}</div>
                      <div style="margin-top:4px;font-size:18px;font-weight:700">${APP_NAME}</div>
                    </td>
                    ${logoBlock}
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 24px 8px">
                ${input.badge ? `<div style="display:inline-block;padding:5px 10px;border-radius:999px;background:#f8f1df;color:#8a6a2f;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:12px">${esc(input.badge)}</div>` : ""}
                <h1 class="email-title" style="margin:0 0 10px;font-size:26px;line-height:1.2;color:#0f172a">${esc(input.title)}</h1>
                <p class="email-text" style="margin:0;color:#334155;font-size:15px;line-height:1.7">${input.intro}</p>
                ${rowsTable}
                ${input.detailsHtml ?? ""}
                ${cta}
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px 24px">
                <hr class="email-divider" style="border:none;border-top:1px solid #e2e8f0;margin:0 0 14px" />
                <p class="email-muted" style="margin:0;color:#64748b;font-size:12px;line-height:1.6">
                  ${esc(input.footerNote ?? `This is an automated message from ${APP_NAME}. For support, contact ${SUPPORT_EMAIL}.`)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  let status = "FAILED";
  let providerRef: string | undefined;
  let error: string | undefined;

  try {
    const { data, error: resendError } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
    });

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
    data: { type: "EMAIL", recipient: to, subject, body: html, status, provider: "RESEND", providerRef, error },
  });
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
  await sendEmail({
    to: params.to,
    subject: `Booking Received: ${params.bookingTitle}`,
    html: renderEmailTemplate({
      preheader: `Your booking request for ${params.facilityName} was received.`,
      badge: "Booking Request",
      title: "Booking received successfully",
      intro: `Hi ${esc(params.name)}, your booking request has been received and is currently pending review by the facility team.`,
      rows: [
        { label: "Booking title", value: esc(params.bookingTitle) },
        { label: "Facility", value: esc(params.facilityName) },
        { label: "Start", value: esc(dt(params.startTime)) },
        { label: "End", value: esc(dt(params.endTime)) },
        { label: "Estimated amount", value: esc(money(params.totalAmount)) },
      ],
      detailsHtml: `
        <div style="margin-top:16px;padding:14px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0">
          <p style="margin:0 0 8px;color:#0f172a;font-weight:700;font-size:13px">What happens next</p>
          ${bulletList([
            "Your request will be reviewed by a facility manager.",
            "You will receive an approval or rejection update by email and SMS.",
            "If approved, a payment link will be shared when payment is required.",
          ])}
        </div>
      `,
    }),
  });
}

export async function sendPaymentReceiptEmail(params: {
  to: string;
  name: string;
  receiptNumber: string;
  amount: number;
  bookingTitle: string;
  receiptUrl?: string;
}) {
  await sendEmail({
    to: params.to,
    subject: `Payment Receipt #${params.receiptNumber}`,
    html: renderEmailTemplate({
      preheader: `Payment confirmed for ${params.bookingTitle}.`,
      badge: "Payment Receipt",
      title: "Payment confirmed",
      intro: `Hi ${esc(params.name)}, your payment has been successfully processed and recorded.`,
      rows: [
        { label: "Receipt number", value: `#${esc(params.receiptNumber)}` },
        { label: "Booking", value: esc(params.bookingTitle) },
        { label: "Amount paid", value: esc(money(params.amount)) },
      ],
      ctaLabel: params.receiptUrl ? "Download receipt" : undefined,
      ctaUrl: params.receiptUrl,
      ctaAltText: params.receiptUrl ? "If the button does not work, copy and open the receipt link from your booking history in the app." : undefined,
    }),
  });
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

  const actionCopy: Record<typeof params.type, string> = {
    SUBMITTED: "submitted for review",
    APPROVED: "approved",
    REJECTED: "rejected",
  };

  await sendEmail({
    to: params.to,
    subject,
    html: renderEmailTemplate({
      preheader: `Expense ${params.type.toLowerCase()} update: ${params.expenseTitle}.`,
      badge: "Expense Update",
      title: `Expense ${params.type.toLowerCase()}`,
      intro: `Hi ${esc(params.name)}, the expense request <strong>${esc(params.expenseTitle)}</strong> has been ${actionCopy[params.type]}.`,
      rows: [
        { label: "Expense title", value: esc(params.expenseTitle) },
        { label: "Amount", value: esc(money(params.amount)) },
        { label: "Status", value: esc(params.type) },
      ],
      detailsHtml: params.reason
        ? `<p style="margin-top:14px;color:#334155;font-size:14px"><strong>Reason:</strong> ${esc(params.reason)}</p>`
        : undefined,
    }),
  });
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
  const isWaived = params.totalAmount === 0;

  await sendEmail({
    to: params.to,
    subject: `Booking Approved: ${params.bookingTitle}`,
    html: renderEmailTemplate({
      preheader: `Your booking for ${params.facilityName} has been approved.`,
      badge: "Booking Approved",
      title: "Your booking is approved",
      intro: `Hi ${esc(params.name)}, great news. Your booking request has been approved.`,
      rows: [
        { label: "Booking title", value: esc(params.bookingTitle) },
        { label: "Facility", value: esc(params.facilityName) },
        { label: "Start time", value: esc(dt(params.startTime)) },
        { label: "Amount due", value: esc(money(params.totalAmount)) },
      ],
      detailsHtml: isWaived
        ? `<p style="margin-top:14px;color:#166534;font-size:14px;font-weight:700">Billing has been waived for this booking.</p>`
        : undefined,
      ctaLabel: !isWaived && params.paymentUrl ? `Pay now (${money(params.totalAmount)})` : undefined,
      ctaUrl: !isWaived ? params.paymentUrl : undefined,
      ctaAltText: !isWaived ? "Complete payment as soon as possible to secure your booking slot." : undefined,
    }),
  });
}

export async function sendBookingRejectedEmail(params: {
  to: string;
  name: string;
  bookingTitle: string;
  reason?: string;
}) {
  await sendEmail({
    to: params.to,
    subject: `Booking Not Approved: ${params.bookingTitle}`,
    html: renderEmailTemplate({
      preheader: `Booking request for ${params.bookingTitle} was not approved.`,
      badge: "Booking Update",
      title: "Booking was not approved",
      intro: `Hi ${esc(params.name)}, your booking request for <strong>${esc(params.bookingTitle)}</strong> was not approved at this time.`,
      detailsHtml: `
        ${params.reason ? `<p style="margin:14px 0 0;color:#334155;font-size:14px"><strong>Reason:</strong> ${esc(params.reason)}</p>` : ""}
        <div style="margin-top:14px;padding:12px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:13px;line-height:1.6">
          You can submit a new request with adjusted date/time options, or contact the facility manager for guidance.
        </div>
      `,
      ctaLabel: "Browse available facilities",
      ctaUrl: APP_URL,
    }),
  });
}

export async function sendMaintenanceOpenedEmail(params: {
  to: string;
  fmName: string;
  facilityName: string;
  requestTitle: string;
  priority: string;
  reportedBy: string;
}) {
  await sendEmail({
    to: params.to,
    subject: `[${params.priority}] Maintenance Request: ${params.requestTitle}`,
    html: renderEmailTemplate({
      preheader: `New ${params.priority.toLowerCase()} maintenance request submitted.`,
      badge: "Maintenance Alert",
      title: "New maintenance request",
      intro: `Hi ${esc(params.fmName)}, a new <strong>${esc(params.priority)}</strong> priority maintenance request has been submitted and needs attention.`,
      rows: [
        { label: "Facility", value: esc(params.facilityName) },
        { label: "Request", value: esc(params.requestTitle) },
        { label: "Priority", value: esc(params.priority) },
        { label: "Reported by", value: esc(params.reportedBy) },
      ],
      ctaLabel: "Open maintenance dashboard",
      ctaUrl: `${APP_URL}/maintenance`,
    }),
  });
}

export async function sendEventPublishedEmail(params: {
  to: string;
  patronName: string;
  eventTitle: string;
  facilityName: string;
  startTime: Date;
  endTime: Date;
}) {
  await sendEmail({
    to: params.to,
    subject: `Upcoming Event: ${params.eventTitle}`,
    html: renderEmailTemplate({
      preheader: `Upcoming event: ${params.eventTitle}.`,
      badge: "Campus Event",
      title: "A new event has been published",
      intro: `Hi ${esc(params.patronName)}, a new event has been scheduled in your campus community.`,
      rows: [
        { label: "Event", value: esc(params.eventTitle) },
        { label: "Venue", value: esc(params.facilityName) },
        { label: "Start", value: esc(dt(params.startTime)) },
        { label: "End", value: esc(dt(params.endTime)) },
      ],
      ctaLabel: "View public listings",
      ctaUrl: APP_URL,
    }),
  });
}

export async function sendPasswordResetOtpEmail(params: {
  to: string;
  name: string;
  otp: string;
  expiresMinutes?: number;
}) {
  const expires = params.expiresMinutes ?? 15;

  await sendEmail({
    to: params.to,
    subject: "Password Reset Code - Revival Mgmt",
    html: renderEmailTemplate({
      preheader: "Use this one-time code to reset your password.",
      badge: "Security",
      title: "Password reset requested",
      intro: `Hi ${esc(params.name)}, use the one-time verification code below to complete your password reset request.`,
      detailsHtml: `
        <div style="margin-top:16px;padding:18px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;text-align:center">
          <p style="margin:0 0 8px;color:#64748b;font-size:12px;letter-spacing:0.07em;text-transform:uppercase">Verification code</p>
          <p style="margin:0;font-size:34px;letter-spacing:0.2em;color:#1e3a5f;font-weight:800">${esc(params.otp)}</p>
        </div>
        <div style="margin-top:14px;padding:12px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:13px;line-height:1.6">
          This code expires in ${expires} minutes. Never share this code with anyone.
        </div>
        <div style="margin-top:12px">
          ${bulletList([
            "If you did not request a password reset, you can ignore this email.",
            "Consider changing your password immediately if you suspect account activity.",
            `For help, contact support at ${esc(SUPPORT_EMAIL)}.`,
          ])}
        </div>
      `,
      footerNote: `Security notice from ${APP_NAME}. If this was not you, ignore this message and review your account security settings.`,
    }),
  });
}

export async function sendPasswordChangedEmail(params: {
  to: string;
  name: string;
}) {
  await sendEmail({
    to: params.to,
    subject: "Your Password Has Been Changed",
    html: renderEmailTemplate({
      preheader: "Your account password was changed.",
      badge: "Security",
      title: "Your password was changed",
      intro: `Hi ${esc(params.name)}, your account password has been changed successfully.`,
      detailsHtml: `
        <div style="margin-top:12px;padding:12px;border-radius:12px;background:#ecfeff;border:1px solid #bae6fd;color:#0c4a6e;font-size:13px;line-height:1.6">
          If you did not perform this action, reset your password immediately and contact support.
        </div>
      `,
      ctaLabel: "Review account",
      ctaUrl: `${APP_URL}/patron`,
    }),
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
    subject: `You've Been Appointed as ${roleLabel}`,
    html: renderEmailTemplate({
      preheader: `You have been appointed as ${roleLabel}.`,
      badge: "Staff Access",
      title: "Welcome to the facility platform",
      intro: `Hi ${esc(params.name)}, you have been appointed as <strong>${esc(roleLabel)}</strong> in ${APP_NAME}.`,
      rows: [
        { label: "Assigned role", value: esc(roleLabel) },
        { label: "Temporary password", value: `<code style="font-size:13px;background:#f1f5f9;padding:2px 6px;border-radius:6px">${esc(params.tempPassword)}</code>` },
      ],
      detailsHtml: `
        <div style="margin-top:14px;padding:12px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;color:#334155;font-size:13px;line-height:1.6">
          You will be prompted to change your password on first login. Keep your credentials secure.
        </div>
      `,
      ctaLabel: "Login now",
      ctaUrl: params.loginUrl,
      ctaAltText: "If the button does not open, copy your login URL into your browser.",
    }),
  });
}

export async function sendStaffPasswordResetEmail(params: {
  to: string;
  name: string;
  tempPassword: string;
  loginUrl: string;
}) {
  await sendEmail({
    to: params.to,
    subject: "Your Staff Password Has Been Reset",
    html: renderEmailTemplate({
      preheader: "A new temporary password has been issued for your staff account.",
      badge: "Staff Access",
      title: "Password reset issued",
      intro: `Hi ${esc(params.name)}, your staff account password has been reset by an administrator.`,
      rows: [
        { label: "Temporary password", value: `<code style="font-size:13px;background:#f1f5f9;padding:2px 6px;border-radius:6px">${esc(params.tempPassword)}</code>` },
      ],
      detailsHtml: `
        <div style="margin-top:14px;padding:12px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;color:#334155;font-size:13px;line-height:1.6">
          You will be prompted to change your password immediately after signing in. If you did not expect this reset, contact your administrator.
        </div>
      `,
      ctaLabel: "Login now",
      ctaUrl: params.loginUrl,
      ctaAltText: "If the button does not open, copy your login URL into your browser.",
    }),
  });
}
