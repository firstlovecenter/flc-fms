"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff, requirePermission } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import type { InventoryCondition, InventoryStatus, MaintenancePriority, MaintenanceStatus } from "@prisma/client";

// ─── Category Actions ──────────────────────────────────────────────────────────

const CategorySchema = z.object({
  name:        z.string().min(2).max(100),
  description: z.string().optional(),
  icon:        z.string().optional(),
});

export async function createInventoryCategory(data: z.infer<typeof CategorySchema>) {
  const session   = await requirePermission("canManageInventory");
  const validated = CategorySchema.parse(data);

  const category = await prisma.inventoryCategory.create({ data: validated });
  auditLog({ userId: session.sub, action: "CREATE_INVENTORY_CATEGORY", entity: "InventoryCategory", entityId: category.id });
  revalidatePath("/inventory");
  return { success: true, category };
}

export async function updateInventoryCategory(id: string, data: z.infer<typeof CategorySchema>) {
  const session   = await requirePermission("canManageInventory");
  const validated = CategorySchema.parse(data);

  const category = await prisma.inventoryCategory.update({ where: { id }, data: validated });
  auditLog({ userId: session.sub, action: "UPDATE_INVENTORY_CATEGORY", entity: "InventoryCategory", entityId: id });
  revalidatePath("/inventory");
  return { success: true, category };
}

export async function deleteInventoryCategory(id: string) {
  const session = await requirePermission("canManageInventory");
  await prisma.inventoryCategory.delete({ where: { id } });
  auditLog({ userId: session.sub, action: "DELETE_INVENTORY_CATEGORY", entity: "InventoryCategory", entityId: id });
  revalidatePath("/inventory");
  return { success: true };
}

export async function getInventoryCategories() {
  await requireStaff();
  return prisma.inventoryCategory.findMany({
    include: { _count: { select: { items: true } } },
    orderBy: { name: "asc" },
  });
}

// ─── Item Actions ──────────────────────────────────────────────────────────────

const ItemSchema = z.object({
  categoryId:   z.string().optional(),
  name:         z.string().min(2).max(200),
  description:  z.string().optional(),
  serialNumber: z.string().optional(),
  assetTag:     z.string().optional(),
  condition:    z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED", "DISPOSED"]).default("GOOD"),
  status:       z.enum(["AVAILABLE", "IN_USE", "CHECKED_OUT", "UNDER_MAINTENANCE", "DISPOSED", "LOST"]).default("AVAILABLE"),
  location:     z.string().optional(),
  quantity:     z.coerce.number().int().positive().default(1),
  unitCost:     z.coerce.number().positive().optional(),
  purchaseDate: z.coerce.date().optional(),
  supplier:     z.string().optional(),
  warrantyExp:  z.coerce.date().optional(),
  notes:        z.string().optional(),
  images:       z.array(z.string()).optional(),
});

export async function createInventoryItem(data: z.infer<typeof ItemSchema>) {
  const session   = await requirePermission("canManageInventory");
  const validated = ItemSchema.parse(data);

  const item = await prisma.inventoryItem.create({
    data: {
      ...validated,
      images: validated.images ?? [],
    },
  });
  auditLog({ userId: session.sub, action: "CREATE_INVENTORY_ITEM", entity: "InventoryItem", entityId: item.id });
  revalidatePath("/inventory");
  return { success: true, item };
}

export async function updateInventoryItem(id: string, data: Partial<z.infer<typeof ItemSchema>>) {
  const session   = await requirePermission("canManageInventory");
  const validated = ItemSchema.partial().parse(data);

  const item = await prisma.inventoryItem.update({ where: { id }, data: validated });
  auditLog({ userId: session.sub, action: "UPDATE_INVENTORY_ITEM", entity: "InventoryItem", entityId: id, after: validated });
  revalidatePath("/inventory");
  return { success: true, item };
}

export async function deleteInventoryItem(id: string) {
  const session = await requirePermission("canManageInventory");
  await prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
  auditLog({ userId: session.sub, action: "DEACTIVATE_INVENTORY_ITEM", entity: "InventoryItem", entityId: id });
  revalidatePath("/inventory");
  return { success: true };
}

export async function getInventoryItems(filters: {
  categoryId?: string;
  status?: InventoryStatus;
  condition?: InventoryCondition;
  search?: string;
  page?: number;
} = {}) {
  await requireStaff();
  const page = filters.page ?? 1;
  const take = 25;

  const where: Record<string, unknown> = { isActive: true };
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.status)     where.status     = filters.status;
  if (filters.condition)  where.condition  = filters.condition;
  if (filters.search) {
    where.OR = [
      { name:         { contains: filters.search, mode: "insensitive" } },
      { serialNumber: { contains: filters.search, mode: "insensitive" } },
      { assetTag:     { contains: filters.search, mode: "insensitive" } },
      { location:     { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.inventoryItem.findMany({
      where,
      include: {
        category: { select: { name: true, icon: true } },
        _count:   { select: { checkouts: true, maintenanceLogs: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  return { items, total, page, pages: Math.ceil(total / take) };
}

export async function getInventoryItem(id: string) {
  await requireStaff();
  return prisma.inventoryItem.findUnique({
    where: { id },
    include: {
      category: true,
      checkouts: {
        include: {
          checkedOutBy: { select: { name: true } },
          returnedBy:   { select: { name: true } },
        },
        orderBy: { checkedOutAt: "desc" },
        take: 10,
      },
      maintenanceLogs: {
        include: { requestedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

// ─── Checkout Actions ──────────────────────────────────────────────────────────

const CheckoutSchema = z.object({
  itemId:       z.string().min(1),
  purpose:      z.string().min(3).max(500),
  quantity:     z.coerce.number().int().positive().default(1),
  locationNote: z.string().optional(),
  dueBack:      z.coerce.date().optional(),
  conditionOut: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED", "DISPOSED"]).default("GOOD"),
  notes:        z.string().optional(),
});

export async function checkoutInventoryItem(data: z.infer<typeof CheckoutSchema>) {
  const session   = await requireStaff();
  const validated = CheckoutSchema.parse(data);

  const item = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: validated.itemId } });
  if (item.status !== "AVAILABLE" && item.status !== "IN_USE") {
    return { error: `Item is currently ${item.status.toLowerCase().replace("_", " ")} and cannot be checked out.` };
  }
  if (item.quantity < validated.quantity) {
    return { error: `Only ${item.quantity} unit(s) available; requested ${validated.quantity}.` };
  }

  const [checkout] = await prisma.$transaction([
    prisma.inventoryCheckout.create({
      data: {
        ...validated,
        checkedOutById: session.sub,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: validated.itemId },
      data:  {
        status:   "CHECKED_OUT",
        quantity: { decrement: validated.quantity },
      },
    }),
  ]);

  auditLog({ userId: session.sub, action: "CHECKOUT_INVENTORY_ITEM", entity: "InventoryCheckout", entityId: checkout.id });
  revalidatePath("/inventory");
  return { success: true, checkout };
}

const ReturnSchema = z.object({
  checkoutId:  z.string().min(1),
  conditionIn: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED", "DISPOSED"]),
  notes:       z.string().optional(),
});

export async function returnInventoryItem(data: z.infer<typeof ReturnSchema>) {
  const session   = await requireStaff();
  const validated = ReturnSchema.parse(data);

  const existing = await prisma.inventoryCheckout.findUniqueOrThrow({
    where: { id: validated.checkoutId },
    include: { item: true },
  });
  if (existing.returnedAt) {
    return { error: "This item has already been returned." };
  }

  const newCondition = validated.conditionIn as InventoryCondition;
  const [checkout] = await prisma.$transaction([
    prisma.inventoryCheckout.update({
      where: { id: validated.checkoutId },
      data:  {
        returnedAt:   new Date(),
        returnedById: session.sub,
        conditionIn:  newCondition,
        notes:        validated.notes,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: existing.itemId },
      data:  {
        status:    "AVAILABLE",
        condition: newCondition,
        quantity:  { increment: existing.quantity },
      },
    }),
  ]);

  auditLog({ userId: session.sub, action: "RETURN_INVENTORY_ITEM", entity: "InventoryCheckout", entityId: validated.checkoutId });
  revalidatePath("/inventory");
  return { success: true, checkout };
}

export async function getActiveCheckouts(filters: { page?: number } = {}) {
  await requireStaff();
  const page = filters.page ?? 1;
  const take = 25;

  const where = { returnedAt: null };
  const [checkouts, total] = await prisma.$transaction([
    prisma.inventoryCheckout.findMany({
      where,
      include: {
        item:         { select: { name: true, assetTag: true, category: { select: { name: true } } } },
        checkedOutBy: { select: { name: true } },
      },
      orderBy: { checkedOutAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.inventoryCheckout.count({ where }),
  ]);

  return { checkouts, total, page, pages: Math.ceil(total / take) };
}

// ─── Inventory Maintenance Actions ────────────────────────────────────────────

const InvMaintSchema = z.object({
  itemId:        z.string().min(1),
  title:         z.string().min(2).max(200),
  description:   z.string().min(5),
  priority:      z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  estimatedCost: z.coerce.number().positive().optional(),
});

const InvMaintUpdateSchema = z.object({
  status:       z.enum(["IN_PROGRESS", "RESOLVED", "CLOSED"]),
  assignedToId: z.string().optional(),
  actualCost:   z.coerce.number().positive().optional(),
});

export async function createInventoryMaintenance(data: z.infer<typeof InvMaintSchema>) {
  const session   = await requirePermission("canCreateMaintenance");
  const validated = InvMaintSchema.parse(data);

  const [maintenance] = await prisma.$transaction([
    prisma.inventoryMaintenance.create({
      data: {
        ...validated,
        requestedById: session.sub,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: validated.itemId },
      data:  { status: "UNDER_MAINTENANCE" },
    }),
  ]);

  auditLog({ userId: session.sub, action: "CREATE_INVENTORY_MAINTENANCE", entity: "InventoryMaintenance", entityId: maintenance.id });
  revalidatePath("/inventory");
  return { success: true, maintenance };
}

export async function updateInventoryMaintenance(
  id: string,
  data: z.infer<typeof InvMaintUpdateSchema>
) {
  const session   = await requireStaff("FACILITY_MANAGER");
  const validated = InvMaintUpdateSchema.parse(data);

  const maintenance = await prisma.inventoryMaintenance.update({
    where: { id },
    data:  {
      ...validated,
      resolvedAt: validated.status === "RESOLVED" ? new Date() : undefined,
      closedAt:   validated.status === "CLOSED"   ? new Date() : undefined,
    },
    include: { item: { select: { id: true } } },
  });

  if (["RESOLVED", "CLOSED"].includes(validated.status)) {
    await prisma.inventoryItem.update({
      where: { id: maintenance.item.id },
      data:  { status: "AVAILABLE" },
    });
  }

  auditLog({ userId: session.sub, action: "UPDATE_INVENTORY_MAINTENANCE", entity: "InventoryMaintenance", entityId: id });
  revalidatePath("/inventory");
  return { success: true, maintenance };
}

export async function getInventoryMaintenanceLogs(filters: {
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  page?: number;
} = {}) {
  await requireStaff();
  const page = filters.page ?? 1;
  const take = 25;

  const where: Record<string, unknown> = {};
  if (filters.status)   where.status   = filters.status;
  if (filters.priority) where.priority = filters.priority;

  const [logs, total] = await prisma.$transaction([
    prisma.inventoryMaintenance.findMany({
      where,
      include: {
        item:        { select: { name: true, assetTag: true } },
        requestedBy: { select: { name: true } },
        assignedTo:  { select: { name: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * take,
      take,
    }),
    prisma.inventoryMaintenance.count({ where }),
  ]);

  return { logs, total, page, pages: Math.ceil(total / take) };
}

// ─── Dashboard Summary ─────────────────────────────────────────────────────────

export async function getInventorySummary() {
  await requireStaff();

  const [
    totalItems,
    availableItems,
    checkedOutItems,
    underMaintenanceItems,
    overdueCheckouts,
    openMaintenanceLogs,
    totalValue,
  ] = await Promise.all([
    prisma.inventoryItem.count({ where: { isActive: true } }),
    prisma.inventoryItem.count({ where: { isActive: true, status: "AVAILABLE" } }),
    prisma.inventoryItem.count({ where: { isActive: true, status: "CHECKED_OUT" } }),
    prisma.inventoryItem.count({ where: { isActive: true, status: "UNDER_MAINTENANCE" } }),
    prisma.inventoryCheckout.count({
      where: { returnedAt: null, dueBack: { lt: new Date() } },
    }),
    prisma.inventoryMaintenance.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.inventoryItem.aggregate({
      where: { isActive: true },
      _sum: { unitCost: true },
    }),
  ]);

  return {
    totalItems,
    availableItems,
    checkedOutItems,
    underMaintenanceItems,
    overdueCheckouts,
    openMaintenanceLogs,
    totalEstimatedValue: totalValue._sum.unitCost ? Number(totalValue._sum.unitCost) : 0,
  };
}
