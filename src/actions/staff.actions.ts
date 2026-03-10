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
