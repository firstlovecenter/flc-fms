import "server-only";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "./db/prisma";
import { redis } from "./redis";

const AUDIT_QUEUE_KEY = "audit_queue";
const AUDIT_DRAIN_BATCH = 50;

interface AuditParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  before?: object | null;
  after?: object | null;
}

/**
 * Fire-and-forget audit logging with Redis-backed retry queue.
 *
 * Strategy:
 * 1. Attempt direct DB write (fast path, works 99% of the time).
 * 2. On failure, push the event to a Redis list (durable queue).
 * 3. On every successful direct write, drain up to 50 queued events so
 *    previously failed events are eventually persisted without a separate worker.
 */
export function auditLog(params: AuditParams): void {
  (async () => {
    let ip = "unknown";
    let ua = "unknown";
    try {
      const h = await headers();
      ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
      ua = h.get("user-agent") ?? "unknown";
    } catch {
      // headers() can throw outside of request context (e.g. background jobs)
    }

    const entry = {
      userId:    params.userId ?? null,
      action:    params.action,
      entity:    params.entity,
      entityId:  params.entityId ?? null,
      // Prisma requires Prisma.JsonNull (not plain null) for nullable JSON fields
      before:    params.before ?? Prisma.JsonNull,
      after:     params.after ?? Prisma.JsonNull,
      ipAddress: ip,
      userAgent: ua,
      createdAt: new Date().toISOString(),
    };

    try {
      await prisma.auditLog.create({ data: entry });
      // Drain any previously queued events on the success path.
      drainAuditQueue().catch(() => {});
    } catch (err) {
      console.error("[AuditLog] Direct write failed, queuing for retry:", err);
      try {
        await redis.rpush(AUDIT_QUEUE_KEY, JSON.stringify(entry));
      } catch (redisErr) {
        // Redis also unavailable — log to stderr as last resort
        console.error("[AuditLog] Queue push failed. Event lost:", JSON.stringify(entry), redisErr);
      }
    }
  })();
}

/**
 * Drain up to AUDIT_DRAIN_BATCH events from the Redis retry queue into the DB.
 * Called opportunistically after every successful direct write.
 */
async function drainAuditQueue(): Promise<void> {
  const queued = await redis.lrange(AUDIT_QUEUE_KEY, 0, AUDIT_DRAIN_BATCH - 1);
  if (queued.length === 0) return;

  const events = queued.flatMap((raw) => {
    try {
      const e = JSON.parse(raw);
      // Restore Prisma.JsonNull for null JSON fields after JSON round-trip
      if (e.before === null) e.before = Prisma.JsonNull;
      if (e.after === null) e.after = Prisma.JsonNull;
      return [e];
    } catch {
      return [];
    }
  });

  if (events.length === 0) return;

  try {
    await prisma.auditLog.createMany({ data: events, skipDuplicates: true });
    // Remove exactly the entries we just persisted
    await redis.ltrim(AUDIT_QUEUE_KEY, queued.length, -1);
  } catch {
    // Leave events in queue for the next drain attempt
  }
}
