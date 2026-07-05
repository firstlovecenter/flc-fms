"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";

const BishopSchema = z.object({
  name: z.string().min(2, "Bishop's name is required").max(100),
  phone: z.string().min(9, "Bishop's contact is required").max(30),
});

/** Public: active bishops for the wedding / naming ceremony booking forms. */
export async function getActiveBishops() {
  return prisma.bishop.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, phone: true },
  });
}

/** Staff: list all bishops (active + inactive) for the management screen. */
export async function getBishops(includeInactive = true) {
  await requirePerm("ceremony:manage");
  return prisma.bishop.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createBishop(data: z.infer<typeof BishopSchema>) {
  const session = await requirePerm("ceremony:manage");
  const validated = BishopSchema.parse(data);

  const existing = await prisma.bishop.findFirst({ where: { name: validated.name } });
  if (existing) return { error: "A Bishop with that name already exists." };

  const maxOrder = await prisma.bishop.aggregate({ _max: { sortOrder: true } });

  const bishop = await prisma.bishop.create({
    data: {
      name: validated.name,
      phone: validated.phone,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  auditLog({ userId: session.sub, action: "CREATE_BISHOP", entity: "Bishop", entityId: bishop.id, after: bishop });
  revalidatePath("/ceremony-codes/bishops");
  return { success: true, bishop };
}

export async function updateBishop(id: string, data: z.infer<typeof BishopSchema>) {
  const session = await requirePerm("ceremony:manage");
  const validated = BishopSchema.parse(data);

  const conflict = await prisma.bishop.findFirst({ where: { name: validated.name, NOT: { id } } });
  if (conflict) return { error: "A Bishop with that name already exists." };

  const bishop = await prisma.bishop.update({
    where: { id },
    data: { name: validated.name, phone: validated.phone },
  });

  auditLog({ userId: session.sub, action: "UPDATE_BISHOP", entity: "Bishop", entityId: id, after: bishop });
  revalidatePath("/ceremony-codes/bishops");
  return { success: true, bishop };
}

/** Toggle a bishop active/inactive (hides them from the booking form without deleting history). */
export async function toggleBishop(id: string) {
  const session = await requirePerm("ceremony:manage");
  const bishop = await prisma.bishop.findUniqueOrThrow({ where: { id } });
  const updated = await prisma.bishop.update({
    where: { id },
    data: { isActive: !bishop.isActive },
  });

  auditLog({ userId: session.sub, action: "TOGGLE_BISHOP", entity: "Bishop", entityId: id, after: updated });
  revalidatePath("/ceremony-codes/bishops");
  return { success: true, bishop: updated };
}

export async function deleteBishop(id: string) {
  const session = await requirePerm("ceremony:manage");
  const bishop = await prisma.bishop.findUnique({ where: { id } });
  if (!bishop) return { error: "Bishop not found." };

  await prisma.bishop.delete({ where: { id } });

  auditLog({ userId: session.sub, action: "DELETE_BISHOP", entity: "Bishop", entityId: id, before: bishop });
  revalidatePath("/ceremony-codes/bishops");
  return { success: true };
}
