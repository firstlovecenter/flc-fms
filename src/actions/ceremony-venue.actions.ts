"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/guards";
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
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");

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
