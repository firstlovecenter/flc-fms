import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sendPushToUser } from "@/lib/notifications/push";
import { sendSMS } from "@/lib/notifications/sms";

/**
 * Cron endpoint: sends due-date reminders for tasks via push + SMS.
 *
 * Two windows are handled per run:
 *   - 24 h before due date  (reminderSentAt24h NULL)
 *   - 1 h  before due date  (reminderSentAt1h  NULL)
 *
 * Both the assignee (if any) and the creator receive reminders.
 *
 * Run every hour — e.g. via Vercel Cron "0 * * * *"
 * GET /api/cron/task-reminders?secret=<CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const expected     = process.env.CRON_SECRET;
  const querySecret  = req.nextUrl.searchParams.get("secret");
  const headerSecret = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!expected || (querySecret !== expected && headerSecret !== expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // ── Window helpers ──────────────────────────────────────────────────────────

  function windowStart(hours: number) {
    return new Date(now.getTime() + hours * 60 * 60 * 1000 - 30 * 60 * 1000); // -30 min buffer
  }
  function windowEnd(hours: number) {
    return new Date(now.getTime() + hours * 60 * 60 * 1000 + 30 * 60 * 1000); // +30 min buffer
  }

  // ── Fetch tasks in each window ──────────────────────────────────────────────

  const [tasks24h, tasks1h] = await Promise.all([
    prisma.task.findMany({
      where: {
        status:           { not: "DONE" },
        dueDate:          { gte: windowStart(24), lte: windowEnd(24) },
        reminderSentAt24h: null,
      },
      include: {
        assignedTo: { select: { id: true, name: true, phone: true } },
        createdBy:  { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.task.findMany({
      where: {
        status:          { not: "DONE" },
        dueDate:         { gte: windowStart(1), lte: windowEnd(1) },
        reminderSentAt1h: null,
      },
      include: {
        assignedTo: { select: { id: true, name: true, phone: true } },
        createdBy:  { select: { id: true, name: true, phone: true } },
      },
    }),
  ]);

  // ── Send helper ─────────────────────────────────────────────────────────────

  async function remind(
    userId: string,
    phone: string | null | undefined,
    name: string | null | undefined,
    taskTitle: string,
    window: "24h" | "1h",
  ) {
    const timeLabel = window === "24h" ? "in 24 hours" : "in 1 hour";

    sendPushToUser(userId, {
      title: `Task due ${timeLabel}`,
      body:  taskTitle,
      url:   "/tasks",
      tag:   `task-reminder-${window}`,
    }).catch(() => {});

    if (phone) {
      sendSMS({
        to:      phone,
        message: `Hi ${name ?? "there"}, reminder: the task "${taskTitle}" is due ${timeLabel}. Log in to FLC FMS to update its status.`,
      }).catch(() => {});
    }
  }

  // ── Process 24h reminders ───────────────────────────────────────────────────

  let sent24h = 0;
  for (const task of tasks24h) {
    try {
      const recipients = [
        task.assignedTo ? { id: task.assignedTo.id, name: task.assignedTo.name, phone: task.assignedTo.phone } : null,
        { id: task.createdBy.id, name: task.createdBy.name, phone: task.createdBy.phone },
      ].filter(Boolean) as { id: string; name: string; phone: string | null }[];

      // Deduplicate (creator may also be assignee)
      const seen = new Set<string>();
      for (const r of recipients) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        await remind(r.id, r.phone, r.name, task.title, "24h");
      }

      await prisma.task.update({
        where: { id: task.id },
        data:  { reminderSentAt24h: now },
      });
      sent24h++;
    } catch {
      // Don't fail the whole batch
    }
  }

  // ── Process 1h reminders ────────────────────────────────────────────────────

  let sent1h = 0;
  for (const task of tasks1h) {
    try {
      const recipients = [
        task.assignedTo ? { id: task.assignedTo.id, name: task.assignedTo.name, phone: task.assignedTo.phone } : null,
        { id: task.createdBy.id, name: task.createdBy.name, phone: task.createdBy.phone },
      ].filter(Boolean) as { id: string; name: string; phone: string | null }[];

      const seen = new Set<string>();
      for (const r of recipients) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        await remind(r.id, r.phone, r.name, task.title, "1h");
      }

      await prisma.task.update({
        where: { id: task.id },
        data:  { reminderSentAt1h: now },
      });
      sent1h++;
    } catch {
      // Don't fail the whole batch
    }
  }

  return NextResponse.json({
    ok: true,
    reminders24h: sent24h,
    reminders1h:  sent1h,
  });
}
