import { prisma } from "@/lib/db/prisma";

const BMS_BASE_URL = process.env.BMS_API_URL!;   // e.g. https://bms.codeslaw.dev/api/v1
const BMS_API_KEY = process.env.BMS_API_KEY!;
const BMS_SENDER_ID = process.env.BMS_SENDER_ID ?? "CFMS";

function bmsHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${BMS_API_KEY}`,
  } as const;
}

// ── Core send ─────────────────────────────────────────────────────────────────

interface SendSMSParams {
  to: string | string[];
  message: string;
}

export async function sendSMS({ to, message }: SendSMSParams) {
  const recipients = Array.isArray(to) ? to : [to];

  for (const recipient of recipients) {
    let status = "FAILED";
    let providerRef: string | undefined;
    let error: string | undefined;

    try {
      const res = await fetch(`${BMS_BASE_URL}/sms/send`, {
        method: "POST",
        headers: bmsHeaders(),
        body: JSON.stringify({
          recipients: [recipient],
          message,
          senderId: BMS_SENDER_ID,
        }),
      });

      const data = await res.json();

      if (res.ok && data.data?.messageId) {
        status = "SENT";
        providerRef = data.data.messageId;
      } else {
        error = data.message ?? "Unknown BMS error";
      }
    } catch (err: any) {
      error = err.message;
    }

    await prisma.notificationLog.create({
      data: {
        type: "SMS",
        recipient,
        body: message,
        status,
        provider: "BMS",
        providerRef,
        error,
      },
    });
  }
}

// ── Balance & status helpers ──────────────────────────────────────────────────

export async function checkSMSBalance(): Promise<{
  balance: number;
  currency: string;
} | null> {
  try {
    const res = await fetch(`${BMS_BASE_URL}/balance`, {
      headers: bmsHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data ?? null;
  } catch {
    return null;
  }
}

export async function getSMSStatus(
  messageId: string
): Promise<{ status: string; deliveredAt?: string } | null> {
  try {
    const res = await fetch(`${BMS_BASE_URL}/sms/status/${encodeURIComponent(messageId)}`, {
      headers: bmsHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data ?? null;
  } catch {
    return null;
  }
}

export async function getSMSHistory(page = 1, limit = 20) {
  try {
    const res = await fetch(
      `${BMS_BASE_URL}/sms?page=${page}&limit=${limit}`,
      { headers: bmsHeaders() }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data ?? null;
  } catch {
    return null;
  }
}

// ── Templated senders ─────────────────────────────────────────────────────────

export async function notifyBookingApproved(params: {
  phone: string;
  bookingTitle: string;
  startTime: Date;
  paymentUrl?: string;
}) {
  const date = params.startTime.toLocaleDateString("en-GH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const paymentSuffix = params.paymentUrl
    ? ` Pay here: ${params.paymentUrl}`
    : ``;
  await sendSMS({
    to: params.phone,
    message: `[CFMS] Your booking "${params.bookingTitle}" on ${date} has been APPROVED.${paymentSuffix}`,
  });
}

export async function notifyBookingRejected(params: {
  phone: string;
  bookingTitle: string;
  reason?: string;
}) {
  const suffix = params.reason ? ` Reason: ${params.reason}` : "";
  await sendSMS({
    to: params.phone,
    message: `[CFMS] Your booking "${params.bookingTitle}" has been REJECTED.${suffix}`,
  });
}

export async function notifyBookingConfirmation(params: {
  phone: string;
  bookingTitle: string;
  startTime: Date;
  facilityName: string;
}) {
  const date = params.startTime.toLocaleDateString("en-GH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  await sendSMS({
    to: params.phone,
    message: `[CFMS] Booking confirmed: "${params.bookingTitle}" at ${params.facilityName} on ${date}.`,
  });
}

export async function notifyPaymentReceived(params: {
  phone: string;
  amount: number;
  currency: string;
  bookingTitle: string;
}) {
  await sendSMS({
    to: params.phone,
    message: `[CFMS] Payment of ${params.currency} ${params.amount.toFixed(2)} received for "${params.bookingTitle}". Thank you!`,
  });
}

export async function notifyExpenseDecision(params: {
  phone: string;
  title: string;
  approved: boolean;
  reason?: string;
}) {
  const status = params.approved ? "APPROVED" : "REJECTED";
  const suffix = !params.approved && params.reason ? ` Reason: ${params.reason}` : "";
  await sendSMS({
    to: params.phone,
    message: `[CFMS] Expense request "${params.title}" has been ${status}.${suffix}`,
  });
}

export async function notifyMaintenanceUpdate(params: {
  phone: string;
  requestId: string;
  facilityName: string;
  status: string;
}) {
  await sendSMS({
    to: params.phone,
    message: `[CFMS] Maintenance #${params.requestId.slice(-6)} at ${params.facilityName} is now ${params.status}.`,
  });
}

export async function notifyEventPublished(params: {
  phone: string;
  eventTitle: string;
  eventDate: Date;
  venue: string;
}) {
  const date = params.eventDate.toLocaleDateString("en-GH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  await sendSMS({
    to: params.phone,
    message: `[CFMS] New event: "${params.eventTitle}" at ${params.venue} on ${date}. Don't miss it!`,
  });
}

export async function notifyPasswordChanged(params: {
  phone: string;
  name: string;
}) {
  await sendSMS({
    to: params.phone,
    message: `[CFMS] Hi ${params.name}, your password has been changed successfully. If you did not make this change, please contact your administrator immediately.`,
  });
}

export async function notifyStaffAppointment(params: {
  phone: string;
  name: string;
  role: string;
  tempPassword: string;
  loginUrl: string;
}) {
  const roleLabel = params.role === "FACILITY_MANAGER" ? "Facility Manager" : "Vicar";
  await sendSMS({
    to: params.phone,
    message: `[CFMS] Hi ${params.name}, you have been appointed as ${roleLabel}. Login at ${params.loginUrl} with your email and temporary password: ${params.tempPassword} — you will be asked to change it on first login.`,
  });
}
