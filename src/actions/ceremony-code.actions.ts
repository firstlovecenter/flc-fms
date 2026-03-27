"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/redis";
import { generateCeremonyCode } from "@/lib/ceremony-utils";
import { notifyCeremonyCode, sendSMS } from "@/lib/notifications/sms";
import { sendCeremonyCodeEmail } from "@/lib/notifications/email";
import type { CeremonyType } from "@prisma/client";

const RequestSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  phone: z.string().min(9, "Phone number is required"),
  email: z.string().email("A valid email is required"),
  ceremonyType: z.enum(["WEDDING", "NAMING"]),
  notes: z.string().optional(),
  receiptUrl: z.string().url().optional(),
});

export async function requestCeremonyCode(
  data: z.infer<typeof RequestSchema>
) {
  const h = await headers();
  const ip = h.get("x-forwarded-for") ?? "unknown";

  const { allowed } = await rateLimit(`ceremony_code_request:${ip}`, 3, 600);
  if (!allowed) {
    return { error: "Too many requests. Please try again later." };
  }

  const validated = RequestSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const { name, phone, email, ceremonyType, notes, receiptUrl } = validated.data;

  // Generate a unique code
  let code: string;
  let attempts = 0;
  do {
    code = generateCeremonyCode();
    const existing = await prisma.ceremonyBookingCode.findUnique({ where: { code } });
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  await prisma.ceremonyBookingCode.create({
    data: {
      code,
      status: "PENDING",
      ceremonyType: ceremonyType as CeremonyType,
      requesterName: name,
      requesterPhone: phone,
      requesterEmail: email,
      notes,
      receiptUrl,
    },
  });

  // Notify staff (BM + FM)
  try {
    const staff = await prisma.user.findMany({
      where: {
        role: { in: ["BOOKING_MANAGER", "FACILITY_MANAGER"] },
        isActive: true,
        phone: { not: null },
      },
      select: { phone: true },
    });
    const ceremonyLabel = ceremonyType === "WEDDING" ? "Wedding" : "Naming";
    for (const s of staff) {
      if (s.phone) {
        await sendSMS({
          to: s.phone,
          message: `[New ${ceremonyLabel} Code Request] ${name} has requested a ${ceremonyLabel} booking code. Review it in /ceremony-codes.`,
        }).catch(() => null);
      }
    }
  } catch {
    // Non-fatal
  }

  return { success: true };
}

export async function activateCeremonyCode(codeId: string) {
  const session = await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");

  const record = await prisma.ceremonyBookingCode.findUnique({
    where: { id: codeId },
  });

  if (!record) return { error: "Code not found." };
  if (record.status !== "PENDING") return { error: "Only PENDING codes can be activated." };

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.ceremonyBookingCode.update({
    where: { id: codeId },
    data: {
      status: "ACTIVE",
      activatedAt: new Date(),
      activatedById: session.sub,
      expiresAt,
    },
  });

  const ceremonyLabel =
    record.ceremonyType === "WEDDING" ? "Wedding" : "Naming";

  // Send SMS + email
  await notifyCeremonyCode({
    phone: record.requesterPhone,
    code: record.code,
    ceremonyType: ceremonyLabel,
    requesterName: record.requesterName,
  }).catch(() => null);

  await sendCeremonyCodeEmail({
    to: record.requesterEmail,
    name: record.requesterName,
    code: record.code,
    ceremonyType: ceremonyLabel,
  }).catch(() => null);

  revalidatePath("/ceremony-codes");
  return { success: true };
}

export async function resendCeremonyCode(codeId: string) {
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");

  const record = await prisma.ceremonyBookingCode.findUnique({
    where: { id: codeId },
  });

  if (!record) return { error: "Code not found." };
  if (record.status !== "ACTIVE") return { error: "Only ACTIVE codes can be resent." };

  const ceremonyLabel =
    record.ceremonyType === "WEDDING" ? "Wedding" : "Naming";

  await notifyCeremonyCode({
    phone: record.requesterPhone,
    code: record.code,
    ceremonyType: ceremonyLabel,
    requesterName: record.requesterName,
  }).catch(() => null);

  await sendCeremonyCodeEmail({
    to: record.requesterEmail,
    name: record.requesterName,
    code: record.code,
    ceremonyType: ceremonyLabel,
  }).catch(() => null);

  return { success: true };
}

export async function revokeCeremonyCode(codeId: string) {
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");

  const record = await prisma.ceremonyBookingCode.findUnique({
    where: { id: codeId },
  });

  if (!record) return { error: "Code not found." };
  if (!["PENDING", "ACTIVE"].includes(record.status)) {
    return { error: "Cannot revoke a USED or EXPIRED code." };
  }

  await prisma.ceremonyBookingCode.update({
    where: { id: codeId },
    data: { status: "EXPIRED" },
  });

  revalidatePath("/ceremony-codes");
  return { success: true };
}

export async function validateCeremonyCode(
  code: string
): Promise<{
  valid: boolean;
  codeId?: string;
  ceremonyType?: string;
  error?: string;
}> {
  const record = await prisma.ceremonyBookingCode.findUnique({
    where: { code },
  });

  if (!record) return { valid: false, error: "Invalid code." };
  if (record.status !== "ACTIVE")
    return { valid: false, error: "This code is not active." };
  if (record.expiresAt && record.expiresAt < new Date())
    return { valid: false, error: "This code has expired." };

  return {
    valid: true,
    codeId: record.id,
    ceremonyType: record.ceremonyType,
  };
}

export async function listCeremonyCodes(searchParams: {
  status?: string;
  search?: string;
  page?: number;
}) {
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");

  const page = searchParams.page ?? 1;
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (searchParams.status && searchParams.status !== "ALL") {
    where.status = searchParams.status;
  }

  if (searchParams.search) {
    const q = searchParams.search;
    where.OR = [
      { requesterName: { contains: q, mode: "insensitive" } },
      { requesterEmail: { contains: q, mode: "insensitive" } },
      { requesterPhone: { contains: q } },
    ];
  }

  const [codes, total] = await Promise.all([
    prisma.ceremonyBookingCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        activatedBy: { select: { name: true } },
      },
    }),
    prisma.ceremonyBookingCode.count({ where }),
  ]);

  return { codes, total };
}
