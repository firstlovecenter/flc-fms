import { prisma } from "@/lib/db/prisma";
import { resolvePermissions, type Permission } from "@/lib/permissions";

/**
 * Active staff (with a phone number) whose effective permissions include the
 * given permission. Replaces the old role-based notification recipient queries
 * (e.g. role IN BOOKING_MANAGER/FACILITY_MANAGER) so that STAFF members granted
 * the relevant permission are reached.
 *
 * Super Admins are excluded — they receive the broadcast push instead, matching
 * the previous behaviour where SA was not part of the targeted approver SMS.
 */
export async function staffPhonesWithPermission(
  permission: Permission,
): Promise<{ phone: string | null }[]> {
  const staff = await prisma.user.findMany({
    where: { isActive: true, phone: { not: null } },
    select: { phone: true, role: true, permissions: true },
  });

  return staff
    .filter(
      (u) =>
        u.role !== "SUPER_ADMIN" &&
        resolvePermissions(u.role, u.permissions as Record<string, boolean> | null)[permission],
    )
    .map((u) => ({ phone: u.phone }));
}
