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
  pricePerHour:   z.coerce.number().positive(),
  pricePerDay:    z.coerce.number().positive().optional(),
  amenities:      z.array(z.string()).default([]),
  images:         z.array(z.string()).default([]),
  availableFrom:  z.string().regex(/^\d{2}:\d{2}$/).default("08:00"),
  availableTo:    z.string().regex(/^\d{2}:\d{2}$/).default("22:00"),
  availableDays:  z.array(z.coerce.number().int().min(0).max(6)).default([0,1,2,3,4,5,6])});

export async function createFacility(data: z.infer<typeof FacilitySchema>) {
  const session = await requirePermission("canManageFacilities");
  const validated = FacilitySchema.parse(data);

  const facility = await prisma.facility.create({
    data: validated
  });

  auditLog({ userId: session.sub, action: "CREATE_FACILITY", entity: "Facility", entityId: facility.id, after: facility });
  revalidatePath("/facilities");
  return { success: true, facility };
}

export async function updateFacility(id: string, data: Partial<z.infer<typeof FacilitySchema>>) {
  const session = await requirePermission("canManageFacilities");
  const before = await prisma.facility.findFirstOrThrow({ where: { id } });
  const facility = await prisma.facility.update({
    where: { id },
    data
  });

  auditLog({ userId: session.sub, action: "UPDATE_FACILITY", entity: "Facility", entityId: id, before, after: facility });
  revalidatePath(`/facilities/${id}`);
  return { success: true, facility };
}

export async function deleteFacility(id: string) {
  const session = await requireStaff("FACILITY_MANAGER");
  await prisma.facility.update({
    where: { id },
    data: { isActive: false }
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
    where: includeInactive ? {} : { isActive: true },
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
  category:            z.string().optional().nullable(),
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

  const slot = await prisma.facilityTimeSlot.create({
    data: {
      facilityId,
      ...validated,
      category: validated.category as any ?? null,
      pricePerHourOverride: validated.pricePerHourOverride ?? null,
    },
  });

  auditLog({ userId: session.sub, action: "CREATE_TIME_SLOT", entity: "FacilityTimeSlot", entityId: slot.id, after: slot });
  revalidatePath(`/facilities/${facilityId}`);
  revalidatePath(`/facilities/${facilityId}/slots`);
  return { success: true, slot };
}

export async function updateTimeSlot(slotId: string, data: Partial<z.infer<typeof TimeSlotSchema>>) {
  const session = await requirePermission("canManageFacilities");

  const slot = await prisma.facilityTimeSlot.update({
    where: { id: slotId },
    data: {
      ...data,
      category: data.category as any,
      pricePerHourOverride: data.pricePerHourOverride ?? null,
    },
  });

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
