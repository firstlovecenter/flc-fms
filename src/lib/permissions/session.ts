import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { resolvePermissions } from "./resolve";
import type { PermissionSet } from "./presets";
import type { Permission } from "./catalog";

export interface StaffAuthContext {
  userId: string;
  role: string;
  permissions: PermissionSet;
  stored: Record<string, boolean>;
}

/** Live permissions from DB, cached per request. */
export const getStaffAuthContext = cache(async (userId: string): Promise<StaffAuthContext | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, permissions: true, isActive: true },
  });
  if (!user || !user.isActive || user.role === "PATRON") return null;

  const stored = (user.permissions as Record<string, boolean>) ?? {};
  const permissions = resolvePermissions(user.role, stored);

  return {
    userId: user.id,
    role: user.role,
    permissions,
    stored,
  };
});

export async function getResolvedPermissions(userId: string, role: string): Promise<PermissionSet> {
  const ctx = await getStaffAuthContext(userId);
  if (ctx) return ctx.permissions;
  return resolvePermissions(role, null);
}

export function ctxHasPermission(ctx: StaffAuthContext, permission: Permission): boolean {
  if (ctx.role === "SUPER_ADMIN") return true;
  return ctx.permissions[permission];
}
