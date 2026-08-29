"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/redis";
import { getSiteSettings } from "@/actions/site-settings.actions";
import {
  sendFacilityFeedbackConfirmationEmail,
  sendFacilityFeedbackReceivedEmail,
} from "@/lib/notifications/email";
import { sendPushToStaffWithPermission } from "@/lib/notifications/push";

const SubmitSchema = z
  .object({
    type: z.enum(["COMPLAINT", "FEEDBACK", "SUGGESTION"]),
    isAnonymous: z.boolean(),
    submitterName: z.string().optional(),
    submitterEmail: z.string().optional(),
    submitterPhone: z.string().optional(),
    facilityId: z.string().optional(),
    subject: z.string().min(3, "Subject is required").max(200),
    message: z.string().min(20, "Please provide at least 20 characters").max(5000),
  })
  .superRefine((data, ctx) => {
    if (data.isAnonymous) return;
    if (!data.submitterName || data.submitterName.trim().length < 2) {
      ctx.addIssue({ code: "custom", message: "Name is required", path: ["submitterName"] });
    }
    const emailOk =
      !!data.submitterEmail && z.string().email().safeParse(data.submitterEmail).success;
    const phoneOk = !!data.submitterPhone && data.submitterPhone.trim().length >= 9;
    if (!emailOk && !phoneOk) {
      ctx.addIssue({
        code: "custom",
        message: "Provide a valid email or phone number so we can reach you",
        path: ["submitterEmail"],
      });
    }
  });

const UpdateSchema = z.object({
  status: z.enum(["IN_REVIEW", "RESOLVED", "CLOSED"]).optional(),
  adminNotes: z.string().max(5000).optional(),
});

export async function getPublicFacilitiesForFeedback() {
  const facilities = await prisma.facility.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return { success: true as const, facilities };
}

export async function submitFacilityFeedback(data: z.infer<typeof SubmitSchema>) {
  const parsed = SubmitSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid submission" };
  }

  const validated = parsed.data;

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed: rlAllowed } = await rateLimit(`feedback:${ip}`, 3, 600);
  if (!rlAllowed) {
    return { error: "Too many submissions. Please wait a few minutes before trying again." };
  }

  if (validated.facilityId) {
    const facility = await prisma.facility.findFirst({
      where: { id: validated.facilityId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!facility) return { error: "Selected facility is not available." };
  }

  const feedback = await prisma.facilityFeedback.create({
    data: {
      type: validated.type,
      isAnonymous: validated.isAnonymous,
      submitterName: validated.isAnonymous ? null : validated.submitterName?.trim() ?? null,
      submitterEmail: validated.isAnonymous ? null : validated.submitterEmail?.trim() ?? null,
      submitterPhone: validated.isAnonymous ? null : validated.submitterPhone?.trim() ?? null,
      facilityId: validated.facilityId || null,
      subject: validated.subject.trim(),
      message: validated.message.trim(),
    },
    include: {
      facility: { select: { name: true } },
    },
  });

  auditLog({
    action: "CREATE_FACILITY_FEEDBACK",
    entity: "FacilityFeedback",
    entityId: feedback.id,
    after: {
      type: feedback.type,
      isAnonymous: feedback.isAnonymous,
      facilityId: feedback.facilityId,
      status: feedback.status,
    },
  });

  const settings = await getSiteSettings();
  const typeLabel =
    validated.type === "COMPLAINT"
      ? "Complaint"
      : validated.type === "SUGGESTION"
        ? "Suggestion"
        : "Feedback";

  void Promise.allSettled([
    settings.officeEmail
      ? sendFacilityFeedbackReceivedEmail({
          to: settings.officeEmail,
          feedbackId: feedback.id,
          typeLabel,
          subject: feedback.subject,
          message: feedback.message,
          facilityName: feedback.facility?.name ?? null,
          isAnonymous: feedback.isAnonymous,
          submitterName: feedback.submitterName,
          submitterEmail: feedback.submitterEmail,
          submitterPhone: feedback.submitterPhone,
        })
      : Promise.resolve(),
    !feedback.isAnonymous && feedback.submitterEmail
      ? sendFacilityFeedbackConfirmationEmail({
          to: feedback.submitterEmail,
          name: feedback.submitterName ?? "there",
          typeLabel,
          subject: feedback.subject,
        })
      : Promise.resolve(),
    sendPushToStaffWithPermission("feedback:manage", {
      title: `New ${typeLabel}`,
      body: feedback.isAnonymous
        ? `Anonymous ${typeLabel.toLowerCase()}: "${feedback.subject}"`
        : `${feedback.submitterName}: "${feedback.subject}"`,
      url: `/feedback/${feedback.id}`,
      tag: `feedback-${feedback.id}`,
    }),
  ]);

  return { success: true as const, id: feedback.id };
}

export async function updateFacilityFeedback(
  id: string,
  data: z.infer<typeof UpdateSchema>,
) {
  const session = await requirePerm("feedback:manage");
  const validated = UpdateSchema.parse(data);

  const existing = await prisma.facilityFeedback.findUnique({ where: { id } });
  if (!existing) return { error: "Feedback not found" };

  const resolvedStatuses = ["RESOLVED", "CLOSED"] as const;
  const shouldSetResolved =
    validated.status && resolvedStatuses.includes(validated.status as (typeof resolvedStatuses)[number]);

  const updated = await prisma.facilityFeedback.update({
    where: { id },
    data: {
      ...(validated.status ? { status: validated.status } : {}),
      ...(validated.adminNotes !== undefined ? { adminNotes: validated.adminNotes || null } : {}),
      ...(shouldSetResolved
        ? { resolvedAt: new Date(), resolvedById: session.sub }
        : {}),
    },
  });

  auditLog({
    userId: session.sub,
    action: "UPDATE_FACILITY_FEEDBACK",
    entity: "FacilityFeedback",
    entityId: id,
    before: { status: existing.status, adminNotes: existing.adminNotes },
    after: { status: updated.status, adminNotes: updated.adminNotes },
  });

  revalidatePath("/feedback");
  revalidatePath(`/feedback/${id}`);

  return { success: true as const };
}
