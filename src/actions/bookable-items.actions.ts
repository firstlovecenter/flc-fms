"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ItemSchema = z.object({
  name:         z.string().min(2).max(120),
  description:  z.string().optional(),
  unit:         z.string().min(1).max(40).default("piece"),
  requiresBookingTerms: z.boolean().default(false),
  requiresItemBookingTerms: z.boolean().default(true),
  pricePerUnit: z.coerce.number().min(0),
  quantity:     z.coerce.number().int().min(1).default(1),
  tags:         z.array(z.string()).default([]),
  images:       z.array(z.string()).default([]),
  isActive:     z.boolean().default(true),
  sortOrder:    z.coerce.number().int().default(0),
});

const BundleComponentSchema = z.object({
  itemId:   z.string().min(1),
  quantity: z.coerce.number().int().min(1).default(1),
  label:    z.string().optional(),
});

const BundleSchema = z.object({
  name:        z.string().min(2).max(120),
  description: z.string().optional(),
  tagline:     z.string().optional(),
  requiresBookingTerms: z.boolean().default(false),
  requiresItemBookingTerms: z.boolean().default(true),
  price:       z.coerce.number().min(0),
  tags:        z.array(z.string()).default([]),
  images:      z.array(z.string()).default([]),
  isActive:    z.boolean().default(true),
  sortOrder:   z.coerce.number().int().default(0),
  components:  z.array(BundleComponentSchema).min(1, "A bundle must have at least one item"),
});

const GuestItemBookingSchema = z.object({
  guestName:  z.string().min(2),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(9, "Phone number is required"),
  title:      z.string().min(2).max(200),
  description:z.string().optional(),
  startTime:  z.coerce.date(),
  endTime:    z.coerce.date(),
  notes:      z.string().optional(),
  lines: z.array(z.object({
    itemId:   z.string().optional(),
    bundleId: z.string().optional(),
    quantity: z.coerce.number().int().min(1),
  })).min(1, "At least one item or bundle is required"),
  acceptedTerms: z.array(z.enum(["BOOKING_TERMS", "ITEM_BOOKING_TERMS"]))
    .optional()
    .default([]),
}).refine(d => d.endTime > d.startTime, {
  message: "End time must be after start time",
  path: ["endTime"],
});

// ─── Public read actions (no auth) ────────────────────────────────────────────

export async function getBookableCatalog() {
  const [items, bundles] = await Promise.all([
    prisma.bookableItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.bookableBundle.findMany({
      where: { isActive: true },
      include: {
        components: {
          include: { item: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return {
    items: items.map(i => ({ ...i, pricePerUnit: i.pricePerUnit.toString() })),
    bundles: bundles.map(b => ({
      ...b,
      price: b.price.toString(),
      components: b.components.map(c => ({
        ...c,
        item: { ...c.item, pricePerUnit: c.item.pricePerUnit.toString() },
      })),
    })),
  };
}

// ─── Guest item booking ───────────────────────────────────────────────────────

export async function createGuestItemBooking(raw: unknown) {
  const parsed = GuestItemBookingSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const data = parsed.data;

  // Compute totalAmount from line items
  let total = 0;
  const lineData: Array<{
    itemId?: string;
    bundleId?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }> = [];

  for (const line of data.lines) {
    if (line.itemId) {
      const item = await prisma.bookableItem.findUnique({ where: { id: line.itemId } });
      if (!item || !item.isActive) return { error: `Item not found or unavailable` };
      if (line.quantity > item.quantity) return { error: `Only ${item.quantity} unit(s) of "${item.name}" available` };
      const unitPrice = Number(item.pricePerUnit);
      const subtotal = unitPrice * line.quantity;
      total += subtotal;
      lineData.push({ itemId: line.itemId, quantity: line.quantity, unitPrice, subtotal });
    } else if (line.bundleId) {
      const bundle = await prisma.bookableBundle.findUnique({ where: { id: line.bundleId } });
      if (!bundle || !bundle.isActive) return { error: `Bundle not found or unavailable` };
      const unitPrice = Number(bundle.price);
      const subtotal = unitPrice * line.quantity;
      total += subtotal;
      lineData.push({ bundleId: line.bundleId, quantity: line.quantity, unitPrice, subtotal });
    } else {
      return { error: "Each line must reference an item or bundle" };
    }
  }

  const requiredTerms = new Set<"BOOKING_TERMS" | "ITEM_BOOKING_TERMS">();
  for (const line of lineData) {
    if (line.itemId) {
      const item = await prisma.bookableItem.findUnique({
        where: { id: line.itemId },
        select: { requiresBookingTerms: true, requiresItemBookingTerms: true },
      });
      if (item?.requiresBookingTerms) requiredTerms.add("BOOKING_TERMS");
      if (item?.requiresItemBookingTerms) requiredTerms.add("ITEM_BOOKING_TERMS");
    }
    if (line.bundleId) {
      const bundle = await prisma.bookableBundle.findUnique({
        where: { id: line.bundleId },
        select: { requiresBookingTerms: true, requiresItemBookingTerms: true },
      });
      if (bundle?.requiresBookingTerms) requiredTerms.add("BOOKING_TERMS");
      if (bundle?.requiresItemBookingTerms) requiredTerms.add("ITEM_BOOKING_TERMS");
    }
  }

  const accepted = new Set(data.acceptedTerms ?? []);
  if (requiredTerms.has("BOOKING_TERMS") && !accepted.has("BOOKING_TERMS")) {
    return { error: "You must agree to Booking Terms and Conditions before submitting." };
  }
  if (requiredTerms.has("ITEM_BOOKING_TERMS") && !accepted.has("ITEM_BOOKING_TERMS")) {
    return { error: "You must agree to Item Booking Terms before submitting." };
  }

  // Find or create guest patron
  let patron = await prisma.patron.findUnique({ where: { email: data.guestEmail } });
  if (!patron) {
    const crypto = await import("crypto");
    const tempHash = crypto.randomBytes(32).toString("hex");
    patron = await prisma.patron.create({
      data: {
        email: data.guestEmail,
        name:  data.guestName,
        phone: data.guestPhone,
        passwordHash: tempHash,
        isVerified: false,
      },
    });
  }

  const booking = await prisma.booking.create({
    data: {
      patronId:     patron.id,
      title:        data.title,
      description:  data.description,
      notes:        data.notes,
      category:     "OTHER",
      startTime:    data.startTime,
      endTime:      data.endTime,
      totalAmount:  total,
      status:       "PENDING",
      lineItems: {
        create: lineData.map(l => ({
          itemId:    l.itemId,
          bundleId:  l.bundleId,
          quantity:  l.quantity,
          unitPrice: l.unitPrice,
          subtotal:  l.subtotal,
        })),
      },
    },
  });

  return { bookingId: booking.id };
}

// ─── Admin: manage items ──────────────────────────────────────────────────────

export async function createBookableItem(raw: unknown) {
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  const parsed = ItemSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const item = await prisma.bookableItem.create({ data: parsed.data });
  await auditLog({ action: "CREATE", entity: "BookableItem", entityId: item.id, after: item });
  revalidatePath("/items");
  revalidatePath("/");
  return { id: item.id };
}

export async function updateBookableItem(id: string, raw: unknown) {
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  const parsed = ItemSchema.partial().safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const item = await prisma.bookableItem.update({ where: { id }, data: parsed.data });
  await auditLog({ action: "UPDATE", entity: "BookableItem", entityId: id, after: item });
  revalidatePath("/items");
  revalidatePath("/");
  return { id };
}

export async function deleteBookableItem(id: string) {
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  await prisma.bookableItem.update({ where: { id }, data: { isActive: false } });
  await auditLog({ action: "DEACTIVATE", entity: "BookableItem", entityId: id });
  revalidatePath("/items");
  revalidatePath("/");
  return { ok: true };
}

export async function getBookableItems() {
  await requireStaff();
  const items = await prisma.bookableItem.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return items.map(i => ({ ...i, pricePerUnit: i.pricePerUnit.toString() }));
}

// ─── Admin: manage bundles ────────────────────────────────────────────────────

export async function createBookableBundle(raw: unknown) {
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  const parsed = BundleSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { components, ...bundleData } = parsed.data;

  const bundle = await prisma.bookableBundle.create({
    data: {
      ...bundleData,
      components: {
        create: components.map(c => ({
          itemId:   c.itemId,
          quantity: c.quantity,
          label:    c.label,
        })),
      },
    },
    include: { components: true },
  });

  await auditLog({ action: "CREATE", entity: "BookableBundle", entityId: bundle.id, after: bundle });
  revalidatePath("/items");
  revalidatePath("/");
  return { id: bundle.id };
}

export async function updateBookableBundle(id: string, raw: unknown) {
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  const parsed = BundleSchema.partial().safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { components, ...bundleData } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.bookableBundle.update({ where: { id }, data: bundleData });
    if (components) {
      await tx.bundleComponent.deleteMany({ where: { bundleId: id } });
      await tx.bundleComponent.createMany({
        data: components.map(c => ({ bundleId: id, itemId: c.itemId, quantity: c.quantity, label: c.label })),
      });
    }
  });

  await auditLog({ action: "UPDATE", entity: "BookableBundle", entityId: id });
  revalidatePath("/items");
  revalidatePath("/");
  return { id };
}

export async function deleteBookableBundle(id: string) {
  await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  await prisma.bookableBundle.update({ where: { id }, data: { isActive: false } });
  await auditLog({ action: "DEACTIVATE", entity: "BookableBundle", entityId: id });
  revalidatePath("/items");
  revalidatePath("/");
  return { ok: true };
}

export async function getBookableBundles() {
  await requireStaff();
  const bundles = await prisma.bookableBundle.findMany({
    include: {
      components: { include: { item: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return bundles.map(b => ({
    ...b,
    price: b.price.toString(),
    components: b.components.map(c => ({
      ...c,
      item: { ...c.item, pricePerUnit: c.item.pricePerUnit.toString() },
    })),
  }));
}
