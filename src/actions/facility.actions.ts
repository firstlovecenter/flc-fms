"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff, requirePermission } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";

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
  categoryMappings: z.array(z.object({
    category: z.string().min(1),
    price: z.coerce.number().positive(),
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
  pricePerHourOverride: z.coerce.number().positive().optional().nullable(),
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

  if (validated.startTime >= validated.endTime) {
    return { error: "End time must be after start time" };
  }

  // Prevent overlapping time slots for the same facility/category/day
  const overlappingSlot = await prisma.facilityTimeSlot.findFirst({
    where: {
      facilityId,
      dayOfWeek: validated.dayOfWeek,
      category: validated.category,
      isActive: true,
      startTime: { lt: validated.endTime },
      endTime: { gt: validated.startTime },
    },
    select: { label: true, startTime: true, endTime: true },
  });
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
