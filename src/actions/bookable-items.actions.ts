"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { sendBookingConfirmationEmail } from "@/lib/notifications/email";
import { notifyBookingConfirmation, notifyFMBookingPending } from "@/lib/notifications/sms";
import { sendPushToPatron, sendPushToAllStaff } from "@/lib/notifications/push";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

type ItemData = {
  id: string;
  name: string;
  pricePerUnit: { toString(): string };
  isActive: boolean;
  requiresBookingTerms: boolean;
  requiresItemBookingTerms: boolean;
};

type BundleData = {
  id: string;
  name: string;
  price: { toString(): string };
  isActive: boolean;
  requiresBookingTerms: boolean;
  requiresItemBookingTerms: boolean;
};

function hashId(id: string): bigint {
  const hash = id.split("").reduce((acc, ch) => (acc * 31n + BigInt(ch.charCodeAt(0))) & 0xFFFFFFFFFFFFFFFFn, 0n);
  return BigInt.asIntN(64, hash);
}

async function acquireItemLock(tx: Tx, itemId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${hashId(itemId)})`;
}

async function countBookedItemQuantity(
  tx: Tx,
  itemId: string,
  startTime: Date,
  endTime: Date,
): Promise<number> {
  // Count units from direct item line items
  const direct = await tx.bookingLineItem.aggregate({
    _sum: { quantity: true },
    where: {
      itemId,
      booking: {
        status: { in: ["PENDING", "APPROVED"] },
        deletedAt: null,
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
    },
  });

  // Count units consumed via bundle line items (item is a component of a booked bundle)
  const bundleComponents = await tx.bundleComponent.findMany({
    where: { itemId },
    select: { bundleId: true, quantity: true },
  });

  let fromBundles = 0;
  if (bundleComponents.length > 0) {
    const bundleIds = bundleComponents.map((bc) => bc.bundleId);
    const bundleLineGroups = await tx.bookingLineItem.groupBy({
      by: ["bundleId"],
      where: {
        bundleId: { in: bundleIds },
        booking: {
          status: { in: ["PENDING", "APPROVED"] },
          deletedAt: null,
          AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
        },
      },
      _sum: { quantity: true },
    });
    const bundleLineMap = new Map(
      bundleLineGroups
        .filter((g) => g.bundleId !== null)
        .map((g) => [g.bundleId!, g._sum.quantity ?? 0]),
    );
    fromBundles = bundleComponents.reduce(
      (sum: number, bc) => sum + Number(bundleLineMap.get(bc.bundleId) ?? 0) * Number(bc.quantity),
      0,
    );
  }

  return (direct._sum.quantity ?? 0) + fromBundles;
}

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
  guestEmail: z.string().min(1, "Email is required").email("Enter a valid email"),
  guestPhone: z.string().min(9, "Phone number is required"),
  title:      z.string().min(2).max(200),
  description:z.string().optional(),
  category:   z.string().optional().default("OTHER"),
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

const ITEM_MIN_LEAD_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function createGuestItemBooking(raw: unknown) {
  const parsed = GuestItemBookingSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const data = parsed.data;

  if (data.startTime.getTime() < Date.now() + ITEM_MIN_LEAD_MS) {
    return { error: "Item bookings must be made at least 24 hours in advance." };
  }

  // Batch-fetch all referenced items, bundles, and bundle components in parallel.
  // Prisma returns [] for `{ in: [] }` queries, so no conditional needed.
  const lineItemIds   = data.lines.filter((l) => l.itemId).map((l) => l.itemId!);
  const lineBundleIds = data.lines.filter((l) => l.bundleId).map((l) => l.bundleId!);

  const [itemsRaw, bundlesRaw, bundleComponentsRaw] = await Promise.all([
    prisma.bookableItem.findMany({
      where: { id: { in: lineItemIds } },
      select: {
        id: true, name: true, pricePerUnit: true, isActive: true,
        requiresBookingTerms: true, requiresItemBookingTerms: true,
      },
    }),
    prisma.bookableBundle.findMany({
      where: { id: { in: lineBundleIds } },
      select: {
        id: true, name: true, price: true, isActive: true,
        requiresBookingTerms: true, requiresItemBookingTerms: true,
      },
    }),
    prisma.bundleComponent.findMany({
      where: { bundleId: { in: lineBundleIds } },
      select: { bundleId: true, itemId: true },
    }),
  ]);

  const itemMap   = new Map<string, ItemData>((itemsRaw as ItemData[]).map((i) => [i.id, i]));
  const bundleMap = new Map<string, BundleData>((bundlesRaw as BundleData[]).map((b) => [b.id, b]));
  const bundleComponentsByBundle = bundleComponentsRaw.reduce(
    (acc, bc) => {
      if (!acc.has(bc.bundleId)) acc.set(bc.bundleId, []);
      acc.get(bc.bundleId)!.push(bc.itemId);
      return acc;
    },
    new Map<string, string[]>(),
  );

  // Pre-validate items/bundles and compute pricing
  let total = 0;
  const lineData: Array<{
    itemId?: string;
    bundleId?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    displayName: string;
  }> = [];

  for (const line of data.lines) {
    if (line.itemId) {
      const item = itemMap.get(line.itemId);
      if (!item || !item.isActive) return { error: "Item not found or unavailable" };
      const unitPrice = Number(item.pricePerUnit);
      const subtotal = unitPrice * line.quantity;
      total += subtotal;
      lineData.push({ itemId: line.itemId, quantity: line.quantity, unitPrice, subtotal, displayName: item.name });
    } else if (line.bundleId) {
      const bundle = bundleMap.get(line.bundleId);
      if (!bundle || !bundle.isActive) return { error: "Bundle not found or unavailable" };
      const unitPrice = Number(bundle.price);
      const subtotal = unitPrice * line.quantity;
      total += subtotal;
      lineData.push({ bundleId: line.bundleId, quantity: line.quantity, unitPrice, subtotal, displayName: bundle.name });
    } else {
      return { error: "Each line must reference an item or bundle" };
    }
  }

  const requiredTerms = new Set<"BOOKING_TERMS" | "ITEM_BOOKING_TERMS">();
  for (const line of lineData) {
    if (line.itemId) {
      const item = itemMap.get(line.itemId);
      if (item?.requiresBookingTerms) requiredTerms.add("BOOKING_TERMS");
      if (item?.requiresItemBookingTerms) requiredTerms.add("ITEM_BOOKING_TERMS");
    }
    if (line.bundleId) {
      const bundle = bundleMap.get(line.bundleId);
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

  // Collect all item IDs that need locking (direct items + bundle component items)
  // Use the already-fetched bundleComponentsByBundle map — no extra queries needed
  const itemIdsToLock = new Set<string>();
  for (const line of lineData) {
    if (line.itemId) {
      itemIdsToLock.add(line.itemId);
    } else if (line.bundleId) {
      for (const itemId of bundleComponentsByBundle.get(line.bundleId) ?? []) {
        itemIdsToLock.add(itemId);
      }
    }
  }
  // Sort IDs for consistent lock ordering to prevent deadlocks
  const sortedItemIds = [...itemIdsToLock].sort();

  type TxResult = { booking: { id: string } } | { error: string };

  const txResult: TxResult = await prisma.$transaction(async (tx): Promise<TxResult> => {
    // Acquire per-item advisory locks in sorted order
    for (const itemId of sortedItemIds) {
      await acquireItemLock(tx, itemId);
    }

    // Check real-time availability for each line (accounting for concurrent bookings)
    for (const line of lineData) {
      if (line.itemId) {
        const item = await tx.bookableItem.findUnique({ where: { id: line.itemId } });
        if (!item || !item.isActive) return { error: "Item not found or unavailable" };
        const booked = await countBookedItemQuantity(tx, line.itemId, data.startTime, data.endTime);
        const available = item.quantity - booked;
        if (line.quantity > available) {
          return {
            error: available <= 0
              ? `"${item.name}" is fully booked for the selected time period`
              : `Only ${available} unit(s) of "${item.name}" available for the selected time period`,
          };
        }
      } else if (line.bundleId) {
        const bundle = await tx.bookableBundle.findUnique({
          where: { id: line.bundleId },
          include: { components: { include: { item: true } } },
        });
        if (!bundle || !bundle.isActive) return { error: "Bundle not found or unavailable" };
        for (const component of bundle.components) {
          const needed = component.quantity * line.quantity;
          const booked = await countBookedItemQuantity(tx, component.itemId, data.startTime, data.endTime);
          const available = component.item.quantity - booked;
          if (needed > available) {
            return {
              error: available <= 0
                ? `"${component.item.name}" is fully booked for the selected time period`
                : `Only ${available} unit(s) of "${component.item.name}" available for the selected time period`,
            };
          }
        }
      }
    }

    const booking = await tx.booking.create({
      data: {
        patronId:    patron!.id,
        title:       data.title,
        description: data.description,
        notes:       data.notes,
        category:    data.category || "OTHER",
        startTime:   data.startTime,
        endTime:     data.endTime,
        totalAmount: total,
        status:      "PENDING",
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
    return { booking };
  });

  if ("error" in txResult) return { error: txResult.error };
  const { booking } = txResult;

  const itemSummary = lineData.map(l => l.displayName).join(", ");
  const claimUrl = `${process.env.NEXT_PUBLIC_APP_URL}/patron/register`;

  // SMS confirmation to booker
  await notifyBookingConfirmation({
    phone:           data.guestPhone,
    bookingTitle:    data.title,
    startTime:       data.startTime,
    facilityName:    itemSummary,
    accountClaimUrl: claimUrl,
  }).catch((e) => console.error("[createGuestItemBooking] SMS failed:", e));

  // Email confirmation to booker
  await sendBookingConfirmationEmail({
    to:              data.guestEmail,
    name:            data.guestName,
    bookingTitle:    data.title,
    facilityName:    itemSummary,
    startTime:       data.startTime,
    endTime:         data.endTime,
    totalAmount:     total,
    accountClaimUrl: claimUrl,
  }).catch((e) => console.error("[createGuestItemBooking] Email failed:", e));

  // Push to patron (if returning guest with existing subscription)
  sendPushToPatron(patron.id, {
    title: "Booking Request Received",
    body:  `Your booking "${data.title}" has been submitted and is pending review.`,
    url:   "/patron/bookings",
    tag:   `booking-created-${booking.id}`,
  });

  // Notify staff (SMS + push)
  const staffUsers = await prisma.user.findMany({
    where: { role: { in: ["BOOKING_MANAGER", "FACILITY_MANAGER"] }, isActive: true },
    select: { phone: true },
  });
  for (const staff of staffUsers) {
    if (staff.phone) {
      await notifyFMBookingPending({
        phone:        staff.phone,
        bookedBy:     data.guestName,
        bookingTitle: data.title,
        facilityName: itemSummary,
        startTime:    data.startTime,
      }).catch(() => null);
    }
  }
  sendPushToAllStaff({
    title: "New Item Booking Pending",
    body:  `${data.guestName} requested "${data.title}". Pending your approval.`,
    url:   "/bookings",
    tag:   `item-booking-pending-${booking.id}`,
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
