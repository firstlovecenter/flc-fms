"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";

const CategorySchema = z.object({
  name: z.string().min(2).max(100),
});

function slugify(name: string) {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/** List all categories (active only by default) */
export async function getBookingCategories(includeInactive = false) {
  return prisma.bookingCategory.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

/** Create a new booking category (FM / Super Admin) */
export async function createBookingCategory(data: z.infer<typeof CategorySchema>) {
  const session = await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  const validated = CategorySchema.parse(data);
  const slug = slugify(validated.name);

  const existing = await prisma.bookingCategory.findFirst({
    where: { OR: [{ name: validated.name }, { slug }] },
  });
  if (existing) return { error: "A category with that name already exists." };

  const maxOrder = await prisma.bookingCategory.aggregate({ _max: { sortOrder: true } });

  const category = await prisma.bookingCategory.create({
    data: {
      name: validated.name,
      slug,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  auditLog({ userId: session.sub, action: "CREATE_BOOKING_CATEGORY", entity: "BookingCategory", entityId: category.id, after: category });
  revalidatePath("/facilities");
  return { success: true, category };
}

/** Update a booking category */
export async function updateBookingCategory(id: string, data: z.infer<typeof CategorySchema>) {
  const session = await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  const validated = CategorySchema.parse(data);
  const slug = slugify(validated.name);

  const conflict = await prisma.bookingCategory.findFirst({
    where: { OR: [{ name: validated.name }, { slug }], NOT: { id } },
  });
  if (conflict) return { error: "A category with that name already exists." };

  const category = await prisma.bookingCategory.update({
    where: { id },
    data: { name: validated.name, slug },
  });

  auditLog({ userId: session.sub, action: "UPDATE_BOOKING_CATEGORY", entity: "BookingCategory", entityId: id, after: category });
  revalidatePath("/facilities");
  return { success: true, category };
}

/** Toggle a category active/inactive */
export async function toggleBookingCategory(id: string) {
  const session = await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  const cat = await prisma.bookingCategory.findUniqueOrThrow({ where: { id } });
  const updated = await prisma.bookingCategory.update({
    where: { id },
    data: { isActive: !cat.isActive },
  });

  auditLog({ userId: session.sub, action: "TOGGLE_BOOKING_CATEGORY", entity: "BookingCategory", entityId: id, after: updated });
  revalidatePath("/facilities");
  return { success: true, category: updated };
}

/** Delete a booking category (only when not in active use) */
export async function deleteBookingCategory(id: string) {
  const session = await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");

  const category = await prisma.bookingCategory.findUnique({ where: { id } });
  if (!category) return { error: "Category not found." };

  const [pricingCount, bookingCount] = await Promise.all([
    prisma.facilityPricing.count({ where: { category: category.slug } }),
    prisma.booking.count({ where: { category: category.slug, deletedAt: null } }),
  ]);

  if (pricingCount > 0 || bookingCount > 0) {
    return {
      error:
        "This category is in use by facility pricing or bookings. Deactivate it instead of deleting.",
    };
  }

  await prisma.bookingCategory.update({
    where: { id },
    data: { isActive: false },
  });

  auditLog({
    userId: session.sub,
    action: "DELETE_BOOKING_CATEGORY",
    entity: "BookingCategory",
    entityId: id,
    before: category,
  });

  revalidatePath("/facilities");
  revalidatePath("/facilities/categories");
  return { success: true };
}
