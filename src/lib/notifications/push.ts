import webpush from "web-push";
import { prisma } from "@/lib/db/prisma";
import { resolvePermissions } from "@/lib/permissions/resolve";
import type { Permission } from "@/lib/permissions/catalog";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@firstlovecenter.org";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidConfigured = true;
  return true;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

// ── Send push to a specific user (staff) ─────────────────────────────────────

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureVapid()) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  await sendToSubscriptions(subs, payload);
}

// ── Send push to a specific patron ───────────────────────────────────────────

export async function sendPushToPatron(patronId: string, payload: PushPayload) {
  if (!ensureVapid()) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { patronId },
  });

  await sendToSubscriptions(subs, payload);
}

// ── Send push to all staff ───────────────────────────────────────────────────

export async function sendPushToAllStaff(payload: PushPayload) {
  if (!ensureVapid()) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { not: null } },
  });

  await sendToSubscriptions(subs, payload);
}

// ── Send push to staff with a specific permission ─────────────────────────────

export async function sendPushToStaffWithPermission(
  permission: Permission,
  payload: PushPayload,
) {
  if (!ensureVapid()) return;

  const staff = await prisma.user.findMany({
    where: { isActive: true, role: { not: "PATRON" } },
    select: { id: true, role: true, permissions: true },
  });

  const userIds = staff
    .filter((u) =>
      resolvePermissions(u.role, u.permissions as Record<string, boolean> | null)[permission],
    )
    .map((u) => u.id);

  await Promise.allSettled(userIds.map((userId) => sendPushToUser(userId, payload)));
}

// ── Internal: send to a list of subscriptions ────────────────────────────────

async function sendToSubscriptions(
  subs: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload
) {
  const body = JSON.stringify(payload);
  const staleIds: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
      } catch (err: any) {
        // 404 or 410 means the subscription is no longer valid
        if (err.statusCode === 404 || err.statusCode === 410) {
          staleIds.push(sub.id);
        }
      }
    })
  );

  // Clean up stale subscriptions
  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: staleIds } },
    });
  }
}
