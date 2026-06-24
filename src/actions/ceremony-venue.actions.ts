"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/guards";
import { getFirstSaturdaysForMonths, toDateStr } from "@/lib/ceremony-utils";
import type { CeremonyType } from "@prisma/client";

const UpsertSchema = z.object({
  images: z.array(z.string().url()).default([]),
  price: z.coerce.number().min(0, "Price must be a non-negative number"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

export async function upsertCeremonyVenueConfig(
  facilityId: string,
  type: CeremonyType,
  data: z.infer<typeof UpsertSchema>
) {
  await requirePerm("ceremony:manage");

  const validated = UpsertSchema.parse(data);

  await prisma.ceremonyVenueConfig.upsert({
    where: { facilityId_type: { facilityId, type } },
    create: {
      facilityId,
      type,
      images: validated.images,
      price: validated.price,
      description: validated.description,
      isActive: validated.isActive,
      sortOrder: validated.sortOrder,
    },
    update: {
      images: validated.images,
      price: validated.price,
      description: validated.description,
      isActive: validated.isActive,
      sortOrder: validated.sortOrder,
    },
  });

  revalidatePath(`/facilities/${facilityId}`);
  revalidatePath(type === "WEDDING" ? "/catalog/weddings" : "/catalog/namings");

  return { success: true };
}

/** Returns facility IDs that have an active CeremonyVenueConfig for the given type. */
export async function getCeremonyFacilityIds(type: CeremonyType): Promise<string[]> {
  const configs = await prisma.ceremonyVenueConfig.findMany({
    where: { type, isActive: true },
    select: { facilityId: true },
  });
  return configs.map((c) => c.facilityId);
}

/**
 * Returns all ceremony days (first Saturdays + staff-added extras) as YYYY-MM-DD strings
 * for the next 13 months. Used by ceremony booking (allowed) and general booking (blocked).
 */
export async function getCeremonyDays(): Promise<string[]> {
  const extras = await prisma.ceremonyDateOverride.findMany({
    select: { date: true },
  });
  const extraStrs = extras.map((e) => toDateStr(e.date));
  const firstSats = getFirstSaturdaysForMonths(13).map(toDateStr);
  return [...new Set([...firstSats, ...extraStrs])].sort();
}

/** Staff: designate an extra Saturday as a ceremony day. */
export async function addCeremonyDateOverride(data: { date: string; note?: string }) {
  const session = await requirePerm("ceremony:manage");
  const d = new Date(data.date + "T12:00:00.000Z");
  if (d.getUTCDay() !== 6) return { error: "Only Saturdays can be designated as ceremony days." };

  await prisma.ceremonyDateOverride.upsert({
    where: { date: d },
    create: { date: d, note: data.note ?? null, createdById: session.sub },
    update: { note: data.note ?? null },
  });
  revalidatePath("/ceremony-codes");
  return { success: true };
}

/** Staff: remove a staff-added ceremony day (first Saturdays are always ceremony days). */
export async function removeCeremonyDateOverride(id: string) {
  await requirePerm("ceremony:manage");
  await prisma.ceremonyDateOverride.delete({ where: { id } });
  revalidatePath("/ceremony-codes");
  return { success: true };
}

/** Staff: list all stored extra ceremony day overrides. */
export async function listCeremonyDateOverrides() {
  await requirePerm("ceremony:manage");
  return prisma.ceremonyDateOverride.findMany({
    include: { createdBy: { select: { name: true } } },
    orderBy: { date: "asc" },
  });
}

export async function getCeremonyVenueConfigs(type: CeremonyType) {
  return prisma.ceremonyVenueConfig.findMany({
    where: { type, isActive: true },
    include: {
      facility: {
        select: {
          id: true,
          name: true,
          capacity: true,
          availableFrom: true,
          availableTo: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { facility: { name: "asc" } }],
  });
}
