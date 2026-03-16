"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import type { VicarPermissions } from "@/lib/staff-permissions";
import { notifyStaffPasswordReset } from "@/lib/notifications/sms";
import { sendStaffPasswordResetEmail } from "@/lib/notifications/email";
import type { Role } from "@prisma/client";

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

  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true },
    select: { name: true, email: true, phone: true },
  });

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`;
  if (user.phone) {
    await notifyStaffPasswordReset({
      phone: user.phone,
      name: user.name,
      tempPassword,
      loginUrl,
    });
  }
  if (user.email) {
    await sendStaffPasswordResetEmail({
      to: user.email,
      name: user.name,
      tempPassword,
      loginUrl,
    });
  }

  auditLog({ userId: session.sub,
    action: "RESET_STAFF_PASSWORD",
    entity: "User", entityId: userId});

  return { success: true };
}

const UpdateStaffSchema = z.object({
  name:  z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(9).optional(),
});

const StaffRoleSchema = z.enum(["SUPER_ADMIN", "FACILITY_MANAGER", "BOOKING_MANAGER", "VICAR"]);

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

export async function updateStaffRole(userId: string, nextRoleInput: string) {
  const session = await requireStaff("FACILITY_MANAGER");
  const nextRole = StaffRoleSchema.parse(nextRoleInput) as Role;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });

  if (!target) return { error: "Staff member not found." };
  if (!target.isActive) return { error: "Cannot change role for an inactive staff member." };
  if (session.sub === userId) return { error: "You cannot change your own role." };

  if (target.role === "SUPER_ADMIN" && session.role !== "SUPER_ADMIN") {
    return { error: "Only Super Admin can modify another Super Admin role." };
  }

  if (nextRole === "SUPER_ADMIN" && session.role !== "SUPER_ADMIN") {
    return { error: "Only Super Admin can assign the Super Admin role." };
  }

  if (nextRole === target.role) return { success: true };

  if (target.role === "SUPER_ADMIN" && nextRole !== "SUPER_ADMIN") {
    const superAdminCount = await prisma.user.count({
      where: { role: "SUPER_ADMIN", isActive: true },
    });

    if (superAdminCount <= 1) {
      return { error: "Cannot demote the only active Super Admin." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: nextRole },
  });

  auditLog({
    userId: session.sub,
    action: "UPDATE_STAFF_ROLE",
    entity: "User",
    entityId: userId,
    before: { role: target.role },
    after: { role: nextRole },
  });

  revalidatePath("/staff");
  return { success: true };
}

export async function updateStaffProfilePicture(
  userId: string,
  profilePicture: string
) {
  const session = await requireStaff();

  // A staff member can update their own picture; FM can update anyone's
  const isSelf = session.sub === userId;
  const isFM = session.role === "FACILITY_MANAGER" || session.role === "SUPER_ADMIN";
  if (!isSelf && !isFM) return { error: "Unauthorized" };

  await prisma.user.update({
    where: { id: userId },
    data: { profilePicture },
  });

  auditLog({
    userId: session.sub,
    action: "UPDATE_PROFILE_PICTURE",
    entity: "User",
    entityId: userId,
  });

  revalidatePath("/staff");
  return { success: true };
}
