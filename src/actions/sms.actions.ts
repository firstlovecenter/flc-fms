"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/redis";
import { sendSMS, checkSMSBalance } from "@/lib/notifications/sms";
import { notifyAccessCode } from "@/lib/notifications/sms";
import { headers } from "next/headers";

const SendCustomSMSSchema = z.object({
  bookingId: z.string().min(1),
  message: z.string().min(3, "Message must be at least 3 characters").max(480, "Message too long (max 480 chars)"),
});

export async function sendCustomSMSToBooker(data: z.input<typeof SendCustomSMSSchema>) {
  const session = await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  const validated = SendCustomSMSSchema.parse(data);

  // Rate limit: 20 SMS per staff per 10 minutes
  const ip = headers().get("x-forwarded-for")?.split(",")[0] ?? session.sub;
  const { allowed } = await rateLimit(`custom_sms:${session.sub}:${ip}`, 20, 600);
  if (!allowed) return { error: "Too many SMS sent. Please wait a few minutes." };

  const booking = await prisma.booking.findFirst({
    where: { id: validated.bookingId, deletedAt: null },
    include: {
      patron: { select: { name: true, phone: true } },
      user: { select: { name: true, phone: true } },
    },
  });

  if (!booking) return { error: "Booking not found." };

  const contact = booking.patron ?? booking.user;
  if (!contact?.phone) return { error: "Booker has no phone number on record." };

  await sendSMS({ to: contact.phone, message: validated.message });

  auditLog({
    userId: session.sub,
    action: "SEND_CUSTOM_SMS",
    entity: "Booking",
    entityId: booking.id,
    after: { recipient: contact.phone, messageLength: validated.message.length },
  });

  revalidatePath(`/bookings/${booking.id}`);
  return { success: true, recipientName: contact.name };
}

const BulkSMSSchema = z.object({
  bookingIds: z.array(z.string().min(1)).min(1).max(50),
  message: z.string().min(3).max(480),
});

export async function sendBulkSMSToBookers(data: z.input<typeof BulkSMSSchema>) {
  const session = await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  const validated = BulkSMSSchema.parse(data);

  const ip = headers().get("x-forwarded-for")?.split(",")[0] ?? session.sub;
  const { allowed } = await rateLimit(`bulk_sms:${session.sub}:${ip}`, 5, 600);
  if (!allowed) return { error: "Too many bulk SMS requests. Please wait a few minutes." };

  const bookings = await prisma.booking.findMany({
    where: { id: { in: validated.bookingIds }, deletedAt: null },
    include: {
      patron: { select: { name: true, phone: true } },
      user: { select: { name: true, phone: true } },
    },
  });

  const phones = new Set<string>();
  for (const b of bookings) {
    const phone = (b.patron ?? b.user)?.phone;
    if (phone) phones.add(phone);
  }

  if (phones.size === 0) return { error: "No valid phone numbers found." };

  await sendSMS({ to: Array.from(phones), message: validated.message });

  auditLog({
    userId: session.sub,
    action: "SEND_BULK_SMS",
    entity: "Booking",
    after: { recipientCount: phones.size, bookingCount: bookings.length },
  });

  return { success: true, sentCount: phones.size };
}

export async function getSMSBalanceAction() {
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  return checkSMSBalance();
}

export async function sendAccessCodeToBooker(bookingId: string) {
  const session = await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");

  const ip = headers().get("x-forwarded-for")?.split(",")[0] ?? session.sub;
  const { allowed } = await rateLimit(`access_code_sms:${session.sub}:${ip}`, 20, 600);
  if (!allowed) return { error: "Too many SMS sent. Please wait a few minutes." };

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    include: {
      facility: { select: { name: true, hasAccessCode: true, accessCode: true } },
      patron: { select: { name: true, phone: true } },
      user: { select: { name: true, phone: true } },
    },
  });

  if (!booking) return { error: "Booking not found." };
  if (!booking.facility?.hasAccessCode || !booking.facility.accessCode) {
    return { error: "This facility does not have an access code." };
  }

  const contact = booking.patron ?? booking.user;
  if (!contact?.phone) return { error: "Booker has no phone number on record." };

  await notifyAccessCode({
    phone: contact.phone,
    bookingTitle: booking.title,
    facilityName: booking.facility.name,
    accessCode: booking.facility.accessCode,
    startTime: booking.startTime,
  });

  auditLog({
    userId: session.sub,
    action: "SEND_ACCESS_CODE_SMS",
    entity: "Booking",
    entityId: booking.id,
    after: { recipient: contact.phone, facilityName: booking.facility.name },
  });

  return { success: true, recipientName: contact.name };
}
