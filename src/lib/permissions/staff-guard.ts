import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { PermSession } from "@/lib/auth/guards";
import { ALL_PERMISSIONS, type Permission } from "./catalog";
import type { PermissionSet } from "./presets";

/*
 * Rules for acting on another staff account, shared by every staff action.
 * staff:manage lets someone run the staff directory; it must not let them take
 * over or out-rank the accounts above them.
 *
 *  - Only staff accounts can be managed here (never patrons).
 *  - Only a Super Admin can act on a Super Admin or a Facility Manager.
 *  - Nobody changes their own role, permissions or active state.
 */

type TargetCheck = { error: string } | { target: { id: string; role: string; isActive: boolean } };

export async function checkStaffTarget(
  session: PermSession,
  targetId: string,
  { allowSelf = false }: { allowSelf?: boolean } = {}
): Promise<TargetCheck> {
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, isActive: true },
  });
  if (!target || target.role === "PATRON") return { error: "Staff member not found." };
  if (!allowSelf && target.id === session.sub) {
    return { error: "You can't make this change to your own account." };
  }
  if (session.role !== "SUPER_ADMIN" && (target.role === "SUPER_ADMIN" || target.role === "FACILITY_MANAGER")) {
    return { error: "Only a Super Admin can manage Super Admin and Facility Manager accounts." };
  }
  return { target };
}

/**
 * Non–Super Admins can only hand out permissions they hold themselves, so
 * staff:manage can't be used to create or edit an account more powerful
 * than its manager.
 */
export function permissionsBeyondActor(session: PermSession, granted: PermissionSet | null): Permission[] {
  if (session.role === "SUPER_ADMIN" || !granted) return [];
  const own = session.authContext?.permissions;
  return ALL_PERMISSIONS.filter((p) => granted[p] && !own?.[p]);
}
