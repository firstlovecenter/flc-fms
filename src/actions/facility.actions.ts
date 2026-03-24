"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff, requirePermission } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { timeRangesOverlap } from "@/lib/time-utils";

const FacilitySchema = z.object({
  name:           z.string().min(2).max(100),
  description:    z.string().optional(),
  capacity:       z.coerce.number().int().positive(),
  acUsageFee:     z.coerce.number().min(0).default(0),
  requiresBookingTerms: z.boolean().default(true),
  requiresItemBookingTerms: z.boolean().default(false),
  amenities:      z.array(z.string()).default([]),
  images:         z.array(z.string()).default([]),
  availableFrom:  z.string().regex(/^\d{2}:\d{2}$/).default("08:00"),
  availableTo:    z.string().regex(/^\d{2}:\d{2}$/).default("22:00"),
  availableDays:  z.array(z.coerce.number().int().min(0).max(6)).default([0,1,2,3,4,5,6]),
  latitude:       z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude:      z.coerce.number().min(-180).max(180).optional().nullable(),
  hasAccessCode:  z.boolean().default(false),
  accessCode:     z.string().max(50).optional().nullable(),
  categoryMappings: z.array(z.object({
    category: z.string().min(1),
    price: z.coerce.number().min(0),
    freeDays: z.array(z.coerce.number().int().min(0).max(6)).default([]),
    description: z.string().max(500).optional().nullable(),
    isActive: z.boolean().default(true),
  })).default([]),
});

const UpdateFacilitySchema = FacilitySchema.partial();

export async function createFacility(data: z.input<typeof FacilitySchema>) {
  const session = await requirePermission("canManageFacilities");
  const validated = FacilitySchema.parse(data);

  const { categoryMappings, ...facilityData } = validated;
  if (categoryMappings.length === 0) {
    return { error: "Add at least one category mapping before saving the facility." };
  }

  const facility = await prisma.$transaction(async (tx) => {
    const created = await tx.facility.create({
      data: facilityData,
    });

    await tx.facilityPricing.createMany({
      data: categoryMappings.map((m) => ({
        facilityId: created.id,
        category: m.category,
        price: m.price,
        freeDays: m.freeDays,
        description: m.description ?? null,
        isActive: m.isActive,
      })),
      skipDuplicates: true,
    });

    return created;
  });

  auditLog({ userId: session.sub, action: "CREATE_FACILITY", entity: "Facility", entityId: facility.id, after: facility });
  revalidatePath("/facilities");
  return { success: true, facility };
}

export async function updateFacility(id: string, data: Partial<z.input<typeof FacilitySchema>>) {
  const session = await requirePermission("canManageFacilities");
  const validated = UpdateFacilitySchema.parse(data);
  const { categoryMappings, ...facilityData } = validated;
  const before = await prisma.facility.findFirstOrThrow({ where: { id } });

  const facility = await prisma.$transaction(async (tx) => {
    const updated = await tx.facility.update({
      where: { id },
      data: facilityData,
    });

    if (categoryMappings) {
      if (categoryMappings.length === 0) {
        return updated;
      }

      const incoming = new Set(categoryMappings.map((m) => m.category));

      await tx.facilityPricing.updateMany({
        where: { facilityId: id, category: { notIn: Array.from(incoming) } },
        data: { isActive: false },
      });

      for (const mapping of categoryMappings) {
        await tx.facilityPricing.upsert({
          where: {
            facilityId_category: {
              facilityId: id,
              category: mapping.category,
            },
          },
          create: {
            facilityId: id,
            category: mapping.category,
            price: mapping.price,
            freeDays: mapping.freeDays,
            description: mapping.description ?? null,
            isActive: mapping.isActive,
          },
          update: {
            price: mapping.price,
            freeDays: mapping.freeDays,
            description: mapping.description ?? null,
            isActive: mapping.isActive,
          },
        });
      }
    }

    return updated;
  });

  auditLog({ userId: session.sub, action: "UPDATE_FACILITY", entity: "Facility", entityId: id, before, after: facility });
  revalidatePath(`/facilities/${id}`);
  revalidatePath(`/facilities/${id}/slots`);
  return { success: true, facility };
}

export async function deleteFacility(id: string) {
  const session = await requirePermission("canManageFacilities");
  await prisma.facility.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date() },
  });

  auditLog({ userId: session.sub, action: "DEACTIVATE_FACILITY", entity: "Facility", entityId: id });
  revalidatePath("/facilities");
  return { success: true };
}

export async function toggleMaintenanceLock(
  facilityId: string,
  lock: boolean,
  maintenanceStartsAt?: Date | null,
  maintenanceEndsAt?: Date | null,
) {
  const session = await requirePermission("canManageFacilities");
  const facility = await prisma.facility.update({
    where: { id: facilityId },
    data: {
      underMaintenance: lock,
      maintenanceStartsAt: lock ? (maintenanceStartsAt ?? new Date()) : null,
      maintenanceEndsAt: lock ? (maintenanceEndsAt ?? null) : null,
    },
  });

  auditLog({
    userId: session.sub,
    action: lock ? "LOCK_FACILITY" : "UNLOCK_FACILITY",
    entity: "Facility",
    entityId: facilityId,
    after: { underMaintenance: lock, maintenanceStartsAt, maintenanceEndsAt },
  });
  revalidatePath(`/facilities/${facilityId}`);
  revalidatePath("/facilities");
  return { success: true, facility };
}

export async function updateFacilitySortOrder(facilityId: string, sortOrder: number) {
  const session = await requirePermission("canManageFacilities");
  const facility = await prisma.facility.update({
    where: { id: facilityId },
    data: { sortOrder },
  });

  auditLog({ userId: session.sub, action: "UPDATE_FACILITY_ORDER", entity: "Facility", entityId: facilityId, after: { sortOrder } });
  revalidatePath("/facilities");
  return { success: true, facility };
}

// ─── Access Code Management ─────────────────────────────────────────────────

export async function updateAccessCode(
  facilityId: string,
  data: { hasAccessCode: boolean; accessCode?: string | null }
) {
  // Only FM and SUPER_ADMIN can edit access codes
  const session = await requireStaff("FACILITY_MANAGER");
  const before = await prisma.facility.findFirstOrThrow({ where: { id: facilityId } });

  const facility = await prisma.facility.update({
    where: { id: facilityId },
    data: {
      hasAccessCode: data.hasAccessCode,
      accessCode: data.hasAccessCode ? (data.accessCode ?? null) : null,
    },
  });

  auditLog({
    userId: session.sub,
    action: "UPDATE_ACCESS_CODE",
    entity: "Facility",
    entityId: facilityId,
    before: { hasAccessCode: before.hasAccessCode },
    after:  { hasAccessCode: data.hasAccessCode },
  });
  revalidatePath(`/facilities/${facilityId}`);
  revalidatePath("/facilities");
  return { success: true, facility };
}

export async function getFacilities(includeInactive = false) {
  return prisma.facility.findMany({
    where: includeInactive
      ? { deletedAt: null }
      : { isActive: true, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getFacility(id: string) {
  return prisma.facility.findFirstOrThrow({ where: { id } });
}

// ─── Time Slot Actions ────────────────────────────────────────────────────────

const TimeSlotSchema = z.object({
  label:               z.string().min(1).max(100),
  dayOfWeek:           z.coerce.number().int().min(0).max(6),
  startTime:           z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  endTime:             z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
  isFlexible:          z.boolean().default(true),
  isFree:              z.boolean().default(false),
  pricePerHourOverride: z.coerce.number().min(0).optional().nullable(),
  maxBookings:         z.coerce.number().int().positive().default(1),
  category:            z.string().min(1, "Category is required"),
});

export async function getTimeSlots(facilityId: string) {
  await requireStaff();
  return prisma.facilityTimeSlot.findMany({
    where: { facilityId, isActive: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export async function createTimeSlot(facilityId: string, data: z.infer<typeof TimeSlotSchema>) {
  const session = await requirePermission("canManageFacilities");
  const validated = TimeSlotSchema.parse(data);

  if (validated.startTime === validated.endTime) {
    return { error: "Start and end time cannot be the same" };
  }

  // Prevent overlapping time slots for the same facility/category/day
  // Fetch candidates and check in JS to handle overnight slots correctly
  const candidateSlots = await prisma.facilityTimeSlot.findMany({
    where: {
      facilityId,
      dayOfWeek: validated.dayOfWeek,
      category: validated.category,
      isActive: true,
    },
    select: { label: true, startTime: true, endTime: true },
  });
  const overlappingSlot = candidateSlots.find((s) =>
    timeRangesOverlap(s.startTime, s.endTime, validated.startTime, validated.endTime),
  );
  if (overlappingSlot) {
    return {
      error: `This slot overlaps with an existing slot "${overlappingSlot.label}" (${overlappingSlot.startTime}–${overlappingSlot.endTime}). Adjust the times or deactivate the conflicting slot first.`,
    };
  }

  const mappedCategory = await prisma.facilityPricing.findFirst({
    where: {
      facilityId,
      category: validated.category,
      isActive: true,
    },
    select: { id: true },
  });

  if (!mappedCategory) {
    return {
      error:
        "This category is not mapped to the facility. Add category pairing in Facility Edit before creating slots.",
    };
  }

  let slot;
  try {
    slot = await prisma.facilityTimeSlot.create({
      data: {
        facilityId,
        ...validated,
        pricePerHourOverride: validated.pricePerHourOverride ?? null,
      },
    });
  } catch {
    return { error: "Unable to create slot. Ensure the selected category is paired with this facility." };
  }

  auditLog({ userId: session.sub, action: "CREATE_TIME_SLOT", entity: "FacilityTimeSlot", entityId: slot.id, after: slot });
  revalidatePath(`/facilities/${facilityId}`);
  revalidatePath(`/facilities/${facilityId}/slots`);
  return { success: true, slot };
}

export async function updateTimeSlot(slotId: string, data: Partial<z.infer<typeof TimeSlotSchema>>) {
  const session = await requirePermission("canManageFacilities");

  const existing = await prisma.facilityTimeSlot.findUnique({
    where: { id: slotId },
    select: { facilityId: true, category: true },
  });

  if (!existing) {
    return { error: "Time slot not found." };
  }

  const targetCategory = data.category ?? existing.category;
  const mappedCategory = await prisma.facilityPricing.findFirst({
    where: {
      facilityId: existing.facilityId,
      category: targetCategory,
      isActive: true,
    },
    select: { id: true },
  });

  if (!mappedCategory) {
    return {
      error:
        "This category is not mapped to the facility. Add category pairing in Facility Edit before updating slots.",
    };
  }

  let slot;
  try {
    slot = await prisma.facilityTimeSlot.update({
      where: { id: slotId },
      data: {
        ...data,
        pricePerHourOverride: data.pricePerHourOverride ?? null,
      },
    });
  } catch {
    return { error: "Unable to update slot. Ensure the selected category is paired with this facility." };
  }

  auditLog({ userId: session.sub, action: "UPDATE_TIME_SLOT", entity: "FacilityTimeSlot", entityId: slotId, after: slot });
  revalidatePath(`/facilities/${slot.facilityId}/slots`);
  return { success: true, slot };
}

export async function deleteTimeSlot(slotId: string) {
  const session = await requirePermission("canManageFacilities");

  const slot = await prisma.facilityTimeSlot.update({
    where: { id: slotId },
    data: { isActive: false },
  });

  auditLog({ userId: session.sub, action: "DELETE_TIME_SLOT", entity: "FacilityTimeSlot", entityId: slotId });
  revalidatePath(`/facilities/${slot.facilityId}/slots`);
  return { success: true };
}

export async function getPublicTimeSlots(facilityId: string) {
  return prisma.facilityTimeSlot.findMany({
    where: { facilityId, isActive: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

// ─── Bulk Time Slot Actions ───────────────────────────────────────────────────

const BulkSlotSchema = z.object({
  facilityIds: z.array(z.string().min(1)).min(1, "Select at least one facility"),
  slot: TimeSlotSchema,
});

export async function bulkCreateTimeSlots(
  facilityIds: string[],
  slotData: z.infer<typeof TimeSlotSchema>,
) {
  const session = await requirePermission("canManageFacilities");
  const { facilityIds: validIds, slot: validated } = BulkSlotSchema.parse({
    facilityIds,
    slot: slotData,
  });

  if (validated.startTime >= validated.endTime) {
    return { error: "End time must be after start time" };
  }

  const created: { facilityId: string; facilityName: string; slotId: string }[] = [];
  const skipped: { facilityId: string; facilityName: string; reason: string }[] = [];

  // Load facility names for reporting
  const facilities = await prisma.facility.findMany({
    where: { id: { in: validIds }, isActive: true },
    select: { id: true, name: true },
  });
  const facilityMap = new Map(facilities.map((f) => [f.id, f.name]));

  for (const facilityId of validIds) {
    const name = facilityMap.get(facilityId) ?? facilityId;

    if (!facilityMap.has(facilityId)) {
      skipped.push({ facilityId, facilityName: name, reason: "Facility not found or inactive" });
      continue;
    }

    // Check category mapping
    const mapping = await prisma.facilityPricing.findFirst({
      where: { facilityId, category: validated.category, isActive: true },
      select: { id: true },
    });
    if (!mapping) {
      skipped.push({ facilityId, facilityName: name, reason: `Category "${validated.category}" not mapped to this facility` });
      continue;
    }

    // Check overlapping slot (fetch candidates, check in JS for overnight support)
    const existingSlots = await prisma.facilityTimeSlot.findMany({
      where: {
        facilityId,
        dayOfWeek: validated.dayOfWeek,
        category: validated.category,
        isActive: true,
      },
      select: { label: true, startTime: true, endTime: true },
    });
    const overlap = existingSlots.find((s) =>
      timeRangesOverlap(s.startTime, s.endTime, validated.startTime, validated.endTime),
    );
    if (overlap) {
      skipped.push({
        facilityId,
        facilityName: name,
        reason: `Overlaps with "${overlap.label}" (${overlap.startTime}–${overlap.endTime})`,
      });
      continue;
    }

    try {
      const slot = await prisma.facilityTimeSlot.create({
        data: {
          facilityId,
          ...validated,
          pricePerHourOverride: validated.pricePerHourOverride ?? null,
        },
      });
      created.push({ facilityId, facilityName: name, slotId: slot.id });
      auditLog({
        userId: session.sub,
        action: "CREATE_TIME_SLOT",
        entity: "FacilityTimeSlot",
        entityId: slot.id,
        after: slot,
      });
      revalidatePath(`/facilities/${facilityId}`);
      revalidatePath(`/facilities/${facilityId}/slots`);
    } catch {
      skipped.push({ facilityId, facilityName: name, reason: "Database error creating slot" });
    }
  }

  revalidatePath("/facilities");
  return { success: true, created, skipped };
}

export async function copyTimeSlotsToFacilities(
  sourceFacilityId: string,
  targetFacilityIds: string[],
) {
  const session = await requirePermission("canManageFacilities");

  if (!sourceFacilityId) return { error: "Source facility is required" };
  if (targetFacilityIds.length === 0) return { error: "Select at least one target facility" };

  const sourceSlots = await prisma.facilityTimeSlot.findMany({
    where: { facilityId: sourceFacilityId, isActive: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  if (sourceSlots.length === 0) {
    return { error: "Source facility has no active time slots to copy" };
  }

  // Filter out source from targets
  const targets = targetFacilityIds.filter((id) => id !== sourceFacilityId);
  if (targets.length === 0) return { error: "Select at least one target facility other than the source" };

  const facilities = await prisma.facility.findMany({
    where: { id: { in: targets }, isActive: true },
    select: { id: true, name: true },
  });
  const facilityMap = new Map(facilities.map((f) => [f.id, f.name]));

  const created: { facilityId: string; facilityName: string; slotId: string; label: string }[] = [];
  const skipped: { facilityId: string; facilityName: string; slotLabel: string; reason: string }[] = [];

  for (const targetId of targets) {
    const name = facilityMap.get(targetId) ?? targetId;

    if (!facilityMap.has(targetId)) {
      skipped.push({ facilityId: targetId, facilityName: name, slotLabel: "(all)", reason: "Facility not found or inactive" });
      continue;
    }

    // Pre-load category mappings and existing slots for this target
    const [mappings, existingSlots] = await Promise.all([
      prisma.facilityPricing.findMany({
        where: { facilityId: targetId, isActive: true },
        select: { category: true },
      }),
      prisma.facilityTimeSlot.findMany({
        where: { facilityId: targetId, isActive: true },
        select: { dayOfWeek: true, category: true, startTime: true, endTime: true },
      }),
    ]);
    const mappedCategories = new Set(mappings.map((m) => m.category));

    for (const src of sourceSlots) {
      if (!mappedCategories.has(src.category)) {
        skipped.push({
          facilityId: targetId,
          facilityName: name,
          slotLabel: src.label,
          reason: `Category "${src.category}" not mapped`,
        });
        continue;
      }

      // Check overlap with existing slots (overnight-aware)
      const hasOverlap = existingSlots.some(
        (e) =>
          e.dayOfWeek === src.dayOfWeek &&
          e.category === src.category &&
          timeRangesOverlap(e.startTime, e.endTime, src.startTime, src.endTime),
      );
      if (hasOverlap) {
        skipped.push({
          facilityId: targetId,
          facilityName: name,
          slotLabel: src.label,
          reason: "Overlaps with existing slot",
        });
        continue;
      }

      try {
        const slot = await prisma.facilityTimeSlot.create({
          data: {
            facilityId: targetId,
            label: src.label,
            dayOfWeek: src.dayOfWeek,
            startTime: src.startTime,
            endTime: src.endTime,
            isFlexible: src.isFlexible,
            isFree: src.isFree,
            pricePerHourOverride: src.pricePerHourOverride,
            maxBookings: src.maxBookings,
            category: src.category,
          },
        });
        created.push({ facilityId: targetId, facilityName: name, slotId: slot.id, label: src.label });
        auditLog({
          userId: session.sub,
          action: "CREATE_TIME_SLOT",
          entity: "FacilityTimeSlot",
          entityId: slot.id,
          after: slot,
        });
      } catch {
        skipped.push({
          facilityId: targetId,
          facilityName: name,
          slotLabel: src.label,
          reason: "Database error creating slot",
        });
      }
    }

    revalidatePath(`/facilities/${targetId}`);
    revalidatePath(`/facilities/${targetId}/slots`);
  }

  revalidatePath("/facilities");
  return { success: true, created, skipped, sourceSlotCount: sourceSlots.length };
}
