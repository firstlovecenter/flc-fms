import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getSession, SessionPayload } from "./session";
import { hasVicarPermission } from "@/lib/staff-permissions";

type AllowedRole = Role | "PATRON";

/** Require the user to have one of the given roles. Redirects otherwise. */
export async function requireRole(
  ...roles: AllowedRole[]
): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!roles.includes(session.role as AllowedRole)) {
    redirect("/unauthorized");
  }

  return session;
}

/** Require staff (non-patron) auth. */
export async function requireStaff(
  ...roles: Role[]
): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");

  const allowedRoles: AllowedRole[] = roles.length > 0 ? roles : ["FACILITY_MANAGER", "BOOKING_MANAGER", "VICAR"];

  if (session.role === "SUPER_ADMIN") return session; // unrestricted
  if (!allowedRoles.includes(session.role as AllowedRole)) redirect("/unauthorized");

  return session;
}

/** Require patron auth. */
export async function requirePatron(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== "PATRON") redirect("/patron/login");

  return session;
}

/** Check a vicar's custom permission. */
export async function requirePermission(
  permission: string
): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (["SUPER_ADMIN", "FACILITY_MANAGER", "BOOKING_MANAGER"].includes(session.role)) {
    return session;
  }

  if (session.role === "VICAR") {
    if (hasVicarPermission(session.permissions, permission)) return session;
    redirect("/unauthorized");
  }

  redirect("/unauthorized");
}
