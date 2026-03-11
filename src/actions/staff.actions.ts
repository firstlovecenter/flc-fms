"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import type { VicarPermissions } from "@/lib/staff-permissions";

export async function getStaffMembers() {
  const session  = await requireStaff("FACILITY_MANAGER");  return prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, email: true, phone: true,
      role: true, permissions: true, lastLoginAt: true, createdAt: true},
    orderBy: [{ role: "asc" }, { name: "asc" }]});
}

export async function updateVicarPermissions(
  vicarId: string,
  permissions: VicarPermissions
) {
  const session  = await requireStaff("FACILITY_MANAGER");  // Guard: vicar must belong to this campus
  const vicar = await prisma.user.findFirstOrThrow({
    where: { id: vicarId, role: "VICAR" }});

  await prisma.user.update({
    where: { id: vicarId },
    data: { permissions: { ...permissions } }});

  auditLog({ userId: session.sub,
    action: "UPDATE_VICAR_PERMISSIONS",
    entity: "User", entityId: vicarId,
    before: vicar.permissions as object,
    after:  permissions});

  revalidatePath("/staff");
  revalidatePath(`/staff/${vicarId}/permissions`);
  return { success: true };
}

export async function deactivateStaffMember(userId: string) {
  const session  = await requireStaff("FACILITY_MANAGER");  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false }});

  auditLog({ userId: session.sub,
    action: "DEACTIVATE_STAFF",
    entity: "User", entityId: userId});

  revalidatePath("/staff");
  return { success: true };
}

export async function reactivateStaffMember(userId: string) {
  const session  = await requireStaff("FACILITY_MANAGER");  await prisma.user.update({
    where: { id: userId },
    data: { isActive: true }});

  auditLog({ userId: session.sub,
    action: "REACTIVATE_STAFF",
    entity: "User", entityId: userId});

  revalidatePath("/staff");
  return { success: true };
}

export async function resetStaffPassword(userId: string) {
  const session  = await requireStaff("FACILITY_MANAGER");  const bcrypt = await import("bcryptjs");
  const tempPassword = `Reset@${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true }});

  auditLog({ userId: session.sub,
    action: "RESET_STAFF_PASSWORD",
    entity: "User", entityId: userId});

  return { success: true, tempPassword };
}

const UpdateStaffSchema = z.object({
  name:  z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(9).optional(),
});

export async function updateStaffMember(
  userId: string,
  data: z.infer<typeof UpdateStaffSchema>
) {
  const session = await requireStaff("FACILITY_MANAGER");
  const validated = UpdateStaffSchema.parse(data);

  const before = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, phone: true },
  });

  // Check email uniqueness if changing
  if (validated.email && validated.email !== before.email) {
    const existing = await prisma.user.findUnique({ where: { email: validated.email } });
    if (existing) return { error: "Email already in use" };
  }

  const updateData: Record<string, string> = {};
  if (validated.name)  updateData.name  = validated.name;
  if (validated.email) updateData.email = validated.email;
  if (validated.phone) updateData.phone = validated.phone;

  await prisma.user.update({ where: { id: userId }, data: updateData });

  auditLog({
    userId: session.sub,
    action: "UPDATE_STAFF",
    entity: "User",
    entityId: userId,
    before,
    after: updateData,
  });

  revalidatePath("/staff");
  return { success: true };
}

export async function getInactiveStaffMembers() {
  await requireStaff("FACILITY_MANAGER");
  return prisma.user.findMany({
    where: { isActive: false },
    select: {
      id: true, name: true, email: true, phone: true,
      role: true, permissions: true, lastLoginAt: true, createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}
