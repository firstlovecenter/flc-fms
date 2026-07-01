"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/redis";
import { generateCeremonyCode } from "@/lib/ceremony-utils";
import { notifyCeremonyCode, sendSMS } from "@/lib/notifications/sms";
import { staffPhonesWithPermission } from "@/lib/notifications/recipients";
import { sendCeremonyCodeEmail } from "@/lib/notifications/email";
import type { CeremonyType } from "@prisma/client";

/**
 * Codes are bound to one specific venue so the amount the requester paid
 * (that facility's flat CeremonyVenueConfig price) matches what the code can
 * redeem — otherwise a code paid for a cheaper venue could book a pricier one.
 */
async function assertVenueOffersCeremony(facilityId: string, ceremonyType: CeremonyType) {
  const config = await prisma.ceremonyVenueConfig.findUnique({
    where: { facilityId_type: { facilityId, type: ceremonyType } },
  });
  if (!config || !config.isActive) {
    return "The selected venue does not offer this ceremony type.";
  }
  return null;
}

const RequestSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  phone: z.string().min(9, "Phone number is required"),
  email: z.string().email("A valid email is required"),
  ceremonyType: z.enum(["WEDDING", "NAMING"]),
  facilityId: z.string().min(1, "Please select a venue"),
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

  const { name, phone, email, ceremonyType, facilityId, notes, receiptUrl } = validated.data;

  const venueError = await assertVenueOffersCeremony(facilityId, ceremonyType as CeremonyType);
  if (venueError) return { error: venueError };

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
      facilityId,
      requesterName: name,
      requesterPhone: phone,
      requesterEmail: email,
      notes,
      receiptUrl,
    },
  });

  // Notify staff (BM + FM)
  try {
    const staff = await staffPhonesWithPermission("ceremony:manage");
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
  const session = await requirePerm("ceremony:manage");

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
  await requirePerm("ceremony:manage");

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
  await requirePerm("ceremony:manage");

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
  facilityId?: string | null;
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
    facilityId: record.facilityId,
  };
}

// ── Staff: create code manually ───────────────────────────────────────────────

const StaffCreateSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  phone: z.string().min(9, "Phone number is required"),
  email: z.string().email("A valid email is required"),
  ceremonyType: z.enum(["WEDDING", "NAMING"]),
  facilityId: z.string().min(1, "Please select a venue"),
  notes: z.string().optional(),
  receiptUrl: z.string().url().optional(),
});

export async function staffCreateCeremonyCode(
  data: z.infer<typeof StaffCreateSchema>
) {
  await requirePerm("ceremony:manage");

  const validated = StaffCreateSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const { name, phone, email, ceremonyType, facilityId, notes, receiptUrl } = validated.data;

  const venueError = await assertVenueOffersCeremony(facilityId, ceremonyType as CeremonyType);
  if (venueError) return { error: venueError };

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
      facilityId,
      requesterName: name,
      requesterPhone: phone,
      requesterEmail: email,
      notes,
      receiptUrl,
    },
  });

  revalidatePath("/ceremony-codes");
  return { success: true };
}

// ── Staff: update code details ────────────────────────────────────────────────

const UpdateSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  phone: z.string().min(9, "Phone number is required"),
  email: z.string().email("A valid email is required"),
  ceremonyType: z.enum(["WEDDING", "NAMING"]),
  facilityId: z.string().min(1, "Please select a venue"),
  notes: z.string().optional(),
});

export async function updateCeremonyCode(
  codeId: string,
  data: z.infer<typeof UpdateSchema>
) {
  await requirePerm("ceremony:manage");

  const validated = UpdateSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const record = await prisma.ceremonyBookingCode.findUnique({ where: { id: codeId } });
  if (!record) return { error: "Code not found." };
  if (record.status === "USED") return { error: "Cannot edit a USED code." };

  const venueError = await assertVenueOffersCeremony(validated.data.facilityId, validated.data.ceremonyType as CeremonyType);
  if (venueError) return { error: venueError };

  await prisma.ceremonyBookingCode.update({
    where: { id: codeId },
    data: {
      requesterName:  validated.data.name,
      requesterPhone: validated.data.phone,
      requesterEmail: validated.data.email,
      facilityId:     validated.data.facilityId,
      ceremonyType:   validated.data.ceremonyType as CeremonyType,
      notes:          validated.data.notes ?? null,
    },
  });

  revalidatePath("/ceremony-codes");
  return { success: true };
}

// ── Staff: delete code ────────────────────────────────────────────────────────

export async function deleteCeremonyCode(codeId: string) {
  await requirePerm("ceremony:manage");

  const record = await prisma.ceremonyBookingCode.findUnique({ where: { id: codeId } });
  if (!record) return { error: "Code not found." };
  if (record.status === "USED") return { error: "Cannot delete a USED code — it is linked to a booking." };

  await prisma.ceremonyBookingCode.delete({ where: { id: codeId } });

  revalidatePath("/ceremony-codes");
  return { success: true };
}

// ── Staff: regenerate code (same payment, new code string) ───────────────────

export async function regenerateCeremonyCode(codeId: string) {
  await requirePerm("ceremony:manage");

  const record = await prisma.ceremonyBookingCode.findUnique({ where: { id: codeId } });
  if (!record) return { error: "Code not found." };
  if (record.status === "USED") return { error: "Cannot regenerate a USED code — it is already linked to a booking." };

  // Generate a new unique code string
  let newCode: string;
  let attempts = 0;
  do {
    newCode = generateCeremonyCode();
    const existing = await prisma.ceremonyBookingCode.findUnique({ where: { code: newCode } });
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  await prisma.ceremonyBookingCode.update({
    where: { id: codeId },
    data: { code: newCode },
  });

  // If ACTIVE, re-send the new code to the requester
  if (record.status === "ACTIVE") {
    const ceremonyLabel = record.ceremonyType === "WEDDING" ? "Wedding" : "Naming";
    await notifyCeremonyCode({
      phone: record.requesterPhone,
      code: newCode,
      ceremonyType: ceremonyLabel,
      requesterName: record.requesterName,
    }).catch(() => null);

    await sendCeremonyCodeEmail({
      to: record.requesterEmail,
      name: record.requesterName,
      code: newCode,
      ceremonyType: ceremonyLabel,
    }).catch(() => null);
  }

  revalidatePath("/ceremony-codes");
  return { success: true };
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listCeremonyCodes(searchParams: {
  status?: string;
  search?: string;
  page?: number;
}) {
  await requirePerm("ceremony:manage");

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
        facility: { select: { name: true } },
      },
    }),
    prisma.ceremonyBookingCode.count({ where }),
  ]);

  return { codes, total };
}
