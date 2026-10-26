import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { PermSession } from "@/lib/auth/guards";

/*
 * Rules for acting on another staff account, shared by every staff action.
 * staff:manage lets someone run the staff directory; it must not let them take
 * over or out-rank the accounts above them.
 *
 *  - Only staff accounts can be managed here (never patrons).
 *  - Only a Super Admin can act on a Super Admin or a Facility Manager.
 *  - Nobody changes their own role, permissions or active state.
 *
 * Within those limits a staff:manage holder can give a staff account any
 * preset or permission, including ones they don't hold themselves.
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
