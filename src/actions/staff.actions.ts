"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePerm, refreshStaffSession } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import {
  type PermissionSet,
  permissionsToFullStored,
  resolveStaffPreset,
  sanitizePermissionInput,
  ALL_PERMISSIONS,
} from "@/lib/permissions";
import { notifyStaffPasswordReset } from "@/lib/notifications/sms";
import { sendStaffPasswordResetEmail } from "@/lib/notifications/email";
import { type Role, Prisma } from "@prisma/client";

export async function getStaffMembers() {
  await requirePerm("staff:view");
  return prisma.user.findMany({
    where: { isActive: true, role: { notIn: ["SUPER_ADMIN", "PATRON"] } },
    select: {
      id: true, name: true, email: true, phone: true,
      role: true, permissions: true, lastLoginAt: true, createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export async function updateStaffPermissions(
  staffId: string,
  permissions: PermissionSet
) {
  const session = await requirePerm("staff:manage");
  const target = await prisma.user.findFirstOrThrow({ where: { id: staffId } });
  if (target.role === "SUPER_ADMIN") {
    return { error: "Super Admin already has full access; permissions can't be edited." };
  }

  const clean = sanitizePermissionInput(
    Object.fromEntries(ALL_PERMISSIONS.map((k) => [k, Boolean(permissions[k])]))
  );
  const full = permissionsToFullStored(
    Object.fromEntries(ALL_PERMISSIONS.map((k) => [k, clean[k] ?? false])) as PermissionSet
  );

  await prisma.user.update({
    where: { id: staffId },
    data: { permissions: full },
  });

  auditLog({
    userId: session.sub,
    action: "UPDATE_STAFF_PERMISSIONS",
    entity: "User",
    entityId: staffId,
    before: target.permissions as object,
    after: full,
  });

  await refreshStaffSession(staffId);

  revalidatePath("/staff");
  revalidatePath(`/staff/${staffId}/permissions`);
  return { success: true };
}

export async function deactivateStaffMember(userId: string) {
  const session = await requirePerm("staff:manage");
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  auditLog({ userId: session.sub, action: "DEACTIVATE_STAFF", entity: "User", entityId: userId });

  revalidatePath("/staff");
  return { success: true };
}

export async function reactivateStaffMember(userId: string) {
  const session = await requirePerm("staff:manage");
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: true },
  });

  auditLog({ userId: session.sub, action: "REACTIVATE_STAFF", entity: "User", entityId: userId });

  revalidatePath("/staff");
  return { success: true };
}

export async function resetStaffPassword(userId: string) {
  const session = await requirePerm("staff:manage");
  const bcrypt = await import("bcryptjs");
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

  auditLog({ userId: session.sub, action: "RESET_STAFF_PASSWORD", entity: "User", entityId: userId });

  return { success: true };
}

const UpdateStaffSchema = z.object({
  name:  z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(9).optional(),
});

const StaffRoleSchema = z.enum(["SUPER_ADMIN", "FACILITY_MANAGER", "STAFF"]);

export async function updateStaffMember(
  userId: string,
  data: z.infer<typeof UpdateStaffSchema>
) {
  const session = await requirePerm("staff:manage");
  const validated = UpdateStaffSchema.parse(data);
  if (validated.email) validated.email = validated.email.trim().toLowerCase();

  const before = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, phone: true },
  });

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
  await requirePerm("staff:view");
  return prisma.user.findMany({
    where: { isActive: false, role: { notIn: ["SUPER_ADMIN", "PATRON"] } },
    select: {
      id: true, name: true, email: true, phone: true,
      role: true, permissions: true, lastLoginAt: true, createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export async function updateStaffRole(userId: string, nextRoleInput: string) {
  const session = await requirePerm("staff:manage");
  const { role: nextRole, permissions: permSet } = resolveStaffPreset(StaffRoleSchema.parse(nextRoleInput));

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

  const preset = permSet === null
    ? Prisma.JsonNull
    : permissionsToFullStored(permSet);

  await prisma.user.update({
    where: { id: userId },
    data: { role: nextRole as Role, permissions: preset },
  });

  await refreshStaffSession(userId);

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
  const session = await requirePerm("staff:view");
  const isSelf = session.sub === userId;
  const canManage = session.role === "SUPER_ADMIN" || session.authContext?.permissions["staff:manage"];
  if (!isSelf && !canManage) return { error: "Unauthorized" };

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
