import { prisma } from "@/lib/db/prisma";
import { randomUUID } from "crypto";

// FLASHSMS_API_URL must be the v2 base URL, e.g. https://app.flashsms.africa/api/v2
// FLASHSMS_API_KEY must be a v2 API key (v1 keys are not accepted by v2 endpoints)
const FLASHSMS_BASE_URL = process.env.FLASHSMS_API_URL!;
const FLASHSMS_API_KEY = process.env.FLASHSMS_API_KEY!;
const FLASHSMS_SENDER_ID = process.env.FLASHSMS_SENDER_ID ?? "CFMS";

function v2Headers(idempotencyKey?: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${FLASHSMS_API_KEY}`,
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
  } as const;
}

// ── Core send ─────────────────────────────────────────────────────────────────

interface SendSMSParams {
  to: string | string[];
  message: string;
}

/** Returns true only if every recipient's message was accepted by the provider. */
export async function sendSMS({ to, message }: SendSMSParams): Promise<boolean> {
  const phones = Array.isArray(to) ? to : [to];

  const results = await Promise.allSettled(
    phones.map(async (phone) => {
      let status = "FAILED";
      let providerRef: string | undefined;
      let error: string | undefined;

      try {
        const res = await fetch(`${FLASHSMS_BASE_URL}/sms/send`, {
          method: "POST",
          headers: v2Headers(randomUUID()),
          body: JSON.stringify({
            phones: [phone],
            message,
            senderId: FLASHSMS_SENDER_ID,
          }),
        });

        const body = await res.json();

        // v2 returns 202 Accepted on success
        if (res.status === 202 && body.data?.id) {
          status = "SENT";
          providerRef = body.data.id;
        } else {
          error = body.error?.message ?? "Unknown FlashSMS error";
        }
      } catch (err: any) {
        error = err.message;
      }

      if (status !== "SENT") {
        console.error(`[SMS] Failed to send to ${phone}:`, error);
      }

      try {
        await prisma.notificationLog.create({
          data: {
            type: "SMS",
            recipient: phone,
            body: message,
            status,
            provider: "BMS",
            providerRef,
            error,
          },
        });
      } catch (logErr) {
        console.error("[SMS] Failed to write notification log:", logErr);
      }

      return status === "SENT";
    }),
  );

  return results.every((r) => r.status === "fulfilled" && r.value === true);
}

// ── Balance & status helpers ──────────────────────────────────────────────────

export async function checkSMSBalance(): Promise<{
  total: number;
  expiry: number;
  nonExpiry: number;
} | null> {
  try {
    const res = await fetch(`${FLASHSMS_BASE_URL}/balance`, {
      headers: v2Headers(),
    });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body.data) return null;
    return {
      total:     body.data.total ?? 0,
      expiry:    body.data.expiry?.credits ?? 0,
      nonExpiry: body.data.nonExpiry?.credits ?? 0,
    };
  } catch {
    return null;
  }
}

export async function getSMSStatus(
  messageId: string,
): Promise<{ status: string; recipientCount?: number; creditsUsed?: number } | null> {
  try {
    const res = await fetch(
      `${FLASHSMS_BASE_URL}/sms/status/${encodeURIComponent(messageId)}`,
      { headers: v2Headers() },
    );
    if (!res.ok) return null;
    const body = await res.json();
    return body.data ?? null;
  } catch {
    return null;
  }
}

export async function getSMSHistory(cursor?: string, limit = 20) {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(
      `${FLASHSMS_BASE_URL}/sms?${params.toString()}`,
      { headers: v2Headers() },
    );
    if (!res.ok) return null;
    const body = await res.json();
    return body.data ?? null;
  } catch {
    return null;
  }
}

// ── Templated senders ─────────────────────────────────────────────────────────

export async function notifyBookingApproved(params: {
  phone: string;
  bookingTitle: string;
  startTime: Date;
}) {
  const date = params.startTime.toLocaleDateString("en-GH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  await sendSMS({
    to: params.phone,
    message: `Your booking "${params.bookingTitle}" on ${date} has been APPROVED.`,
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
    message: `Your booking "${params.bookingTitle}" has been DECLINED.${suffix}`,
  });
}

export async function notifyBookingCancelled(params: {
  phone: string;
  bookingTitle: string;
  cancelledByStaff?: boolean;
}) {
  const by = params.cancelledByStaff ? " by the facility team" : "";
  await sendSMS({
    to: params.phone,
    message: `Your booking "${params.bookingTitle}" has been CANCELLED${by}. Contact us if you have any questions.`,
  });
}

export async function notifyBookingConfirmation(params: {
  phone: string;
  bookingTitle: string;
  startTime: Date;
  facilityName: string;
  accountClaimUrl?: string;
}) {
  const date = params.startTime.toLocaleDateString("en-GH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const claimSuffix = params.accountClaimUrl
    ? ` Create an account to track your booking: ${params.accountClaimUrl}`
    : "";
  await sendSMS({
    to: params.phone,
    message: `Your booking "${params.bookingTitle}" at ${params.facilityName} on ${date}.${claimSuffix} is being reviewed.`,
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
    message: `Expense request "${params.title}" has been ${status}.${suffix}`,
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
    message: `Maintenance #${params.requestId.slice(-6)} at ${params.facilityName} is now ${params.status}.`,
  });
}

export async function notifyPasswordChanged(params: {
  phone: string;
  name: string;
}) {
  await sendSMS({
    to: params.phone,
    message: `Hi ${params.name}, your password has been changed successfully. If you did not make this change, please contact your administrator immediately.`,
  });
}

export async function notifyStaffAppointment(params: {
  phone: string;
  name: string;
  role: string;
  tempPassword: string;
  loginUrl: string;
}) {
  const roleLabelMap: Record<string, string> = { FACILITY_MANAGER: "Facility Manager", BOOKING_MANAGER: "Booking Manager", VICAR: "Vicar", STAFF: "Staff" };
  const roleLabel = roleLabelMap[params.role] ?? params.role;
  await sendSMS({
    to: params.phone,
    message: `Hi ${params.name}, you have been appointed as ${roleLabel}. Login at ${params.loginUrl} with your email and temporary password: ${params.tempPassword} — you will be asked to change it on first login.`,
  });
}

export async function notifyStaffPasswordReset(params: {
  phone: string;
  name: string;
  tempPassword: string;
  loginUrl: string;
}) {
  await sendSMS({
    to: params.phone,
    message: `Hi ${params.name}, your staff account password has been reset. Login at ${params.loginUrl} with your email and temporary password: ${params.tempPassword}. You will be asked to change it on first login.`,
  });
}

export async function notifyFMExpenseSubmitted(params: {
  phone: string;
  submittedBy: string;
  title: string;
  amount: number;
}) {
  await sendSMS({
    to: params.phone,
    message: `[Expense Request] ${params.submittedBy} submitted an expense: "${params.title}" (GH₵${params.amount.toFixed(2)}). Review it in your dashboard.`,
  });
}

export async function notifyFMMaintenanceRequested(params: {
  phone: string;
  requestedBy: string;
  title: string;
  priority: string;
  facilityName?: string;
}) {
  const facilityPart = params.facilityName ? ` at ${params.facilityName}` : "";
  await sendSMS({
    to: params.phone,
    message: `[${params.priority} Maintenance] ${params.requestedBy} submitted a request${facilityPart}: "${params.title}". Review it in your dashboard.`,
  });
}

export async function notifyCeremonyCode(params: {
  phone: string;
  code: string;
  ceremonyType: string; // "Wedding" or "Naming"
  requesterName: string;
}): Promise<boolean> {
  return sendSMS({
    to: params.phone,
    message: `Hi ${params.requesterName}, your ${params.ceremonyType} booking code is: ${params.code}. Valid for 30 days. Use it on our website to complete your booking.`,
  });
}

export async function notifyBookingCompleted(params: {
  phone: string;
  bookingTitle: string;
  startTime: Date;
}) {
  const date = params.startTime.toLocaleDateString("en-GH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  await sendSMS({
    to: params.phone,
    message: `Your booking "${params.bookingTitle}" on ${date} has been marked as COMPLETED. Thank you!`,
  });
}

export async function notifyFMBookingPending(params: {
  phone: string;
  bookedBy: string;
  bookingTitle: string;
  facilityName: string;
  startTime: Date;
}) {
  const date = params.startTime.toLocaleDateString("en-GH", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
  await sendSMS({
    to: params.phone,
    message: `[New Booking] ${params.bookedBy} booked "${params.bookingTitle}" at ${params.facilityName} on ${date}. Pending your approval.`,
  });
}

export async function notifyAccessCode(params: {
  phone: string;
  bookingTitle: string;
  facilityName: string;
  accessCode: string;
  startTime: Date;
}) {
  const time = params.startTime.toLocaleTimeString("en-GH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  await sendSMS({
    to: params.phone,
    message: `Your access code for "${params.bookingTitle}" at ${params.facilityName} (${time}) is: ${params.accessCode}. Please present this upon arrival.`,
  });
}
