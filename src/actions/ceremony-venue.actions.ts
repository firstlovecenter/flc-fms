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
  revalidatePath("/");

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
 * Returns all ceremony days (first Saturdays, minus any staff-excluded ones,
 * plus staff-added extras) as YYYY-MM-DD strings for the next 13 months. Used
 * by ceremony booking (allowed) and general booking (blocked).
 */
export async function getCeremonyDays(): Promise<string[]> {
  const overrides = await prisma.ceremonyDateOverride.findMany({
    select: { date: true, type: true },
  });
  const excluded = new Set(
    overrides.filter((o) => o.type === "EXCLUDE").map((o) => toDateStr(o.date)),
  );
  const added = overrides
    .filter((o) => o.type === "ADD")
    .map((o) => toDateStr(o.date));
  const firstSats = getFirstSaturdaysForMonths(13)
    .map(toDateStr)
    .filter((d) => !excluded.has(d));
  return [...new Set([...firstSats, ...added])].sort();
}

/** Staff: designate an extra Saturday as a ceremony day, or exclude an automatic first Saturday. */
export async function addCeremonyDateOverride(data: { date: string; note?: string; type?: "ADD" | "EXCLUDE" }) {
  const session = await requirePerm("ceremony:manage");
  const d = new Date(data.date + "T12:00:00.000Z");
  if (d.getUTCDay() !== 6) return { error: "Only Saturdays can be designated as ceremony days." };
  const type = data.type ?? "ADD";

  await prisma.ceremonyDateOverride.upsert({
    where: { date: d },
    create: { date: d, type, note: data.note ?? null, createdById: session.sub },
    update: { type, note: data.note ?? null },
  });
  revalidatePath("/ceremony-codes");
  return { success: true };
}

/** Staff: remove a date override — restores it to whatever it would default to (automatic or not a ceremony day). */
export async function removeCeremonyDateOverride(id: string) {
  await requirePerm("ceremony:manage");
  await prisma.ceremonyDateOverride.delete({ where: { id } });
  revalidatePath("/ceremony-codes");
  return { success: true };
}

/** Staff: list all stored ceremony day overrides (both ADD and EXCLUDE). */
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

/**
 * Returns ceremony-eligible venues for a given type in the same shape the
 * unified booking form (GuestBookingForm) expects for regular facilities,
 * with `flatPrice` (the per-venue ceremony price) attached. Public — used by
 * the in-form Regular/Naming/Wedding selector to load venues on demand.
 */
export async function getCeremonyBookableFacilities(type: CeremonyType) {
  const configs = await prisma.ceremonyVenueConfig.findMany({
    where: { type, isActive: true },
    include: {
      facility: {
        select: {
          id: true,
          name: true,
          description: true,
          capacity: true,
          requiresBookingTerms: true,
          requiresItemBookingTerms: true,
          acUsageFee: true,
          amenities: true,
          availableDays: true,
          availableFrom: true,
          availableTo: true,
          isActive: true,
          underMaintenance: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { facility: { name: "asc" } }],
  });

  return configs
    .filter((c) => c.facility.isActive && !c.facility.underMaintenance)
    .map((c) => ({
      id: c.facility.id,
      name: c.facility.name,
      description: c.facility.description,
      capacity: c.facility.capacity,
      requiresBookingTerms: c.facility.requiresBookingTerms,
      requiresItemBookingTerms: c.facility.requiresItemBookingTerms,
      acUsageFee: Number(c.facility.acUsageFee),
      amenities: c.facility.amenities,
      availableDays: c.facility.availableDays,
      availableFrom: c.facility.availableFrom,
      availableTo: c.facility.availableTo,
      pricePerHour: Number(c.price).toString(),
      flatPrice: Number(c.price),
    }));
}
