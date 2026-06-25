import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getSession, SessionPayload, setSession } from "./session";
import {
  getStaffAuthContext,
  ctxHasPermission,
  type StaffAuthContext,
} from "@/lib/permissions/session";
import {
  hasPermission,
  hasAnyPermission,
  type Permission,
} from "@/lib/permissions";

type AllowedRole = Role | "PATRON";

export interface PermSession extends SessionPayload {
  authContext?: NonNullable<Awaited<ReturnType<typeof getStaffAuthContext>>>;
}

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

  const allowedRoles: AllowedRole[] = roles.length > 0 ? roles : ["FACILITY_MANAGER", "BOOKING_MANAGER", "VICAR", "STAFF"];

  if (session.role === "SUPER_ADMIN") return session;
  if (!allowedRoles.includes(session.role as AllowedRole)) redirect("/unauthorized");

  return session;
}

/** Require patron auth. */
export async function requirePatron(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== "PATRON") redirect("/patron/login");

  return session;
}

/**
 * Authoritative permission guard — loads live permissions from DB.
 * Super Admin always passes. Patrons are rejected.
 */
export async function requirePerm(
  permission: Permission | Permission[]
): Promise<PermSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "PATRON") redirect("/unauthorized");

  if (session.role === "SUPER_ADMIN") {
    return session;
  }

  const ctx = await getStaffAuthContext(session.sub);
  if (!ctx) redirect("/unauthorized");

  const perms = Array.isArray(permission) ? permission : [permission];
  const allowed = perms.some((p) => ctxHasPermission(ctx, p));
  if (!allowed) redirect("/unauthorized");

  return { ...session, authContext: ctx };
}

/** For server actions that return errors instead of redirecting. */
export async function checkPerm(
  permission: Permission | Permission[]
): Promise<{ session: PermSession } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };
  if (session.role === "PATRON") return { error: "Unauthorized" };

  if (session.role === "SUPER_ADMIN") {
    return { session };
  }

  const ctx = await getStaffAuthContext(session.sub);
  if (!ctx) return { error: "Unauthorized" };

  const perms = Array.isArray(permission) ? permission : [permission];
  const allowed = perms.some((p) => ctxHasPermission(ctx, p));
  if (!allowed) return { error: "Unauthorized" };

  return { session: { ...session, authContext: ctx } };
}

/** @deprecated Use requirePerm */
export async function requireStaffPermission(
  key: Permission
): Promise<SessionPayload> {
  return requirePerm(key);
}

/** @deprecated Use requirePerm — no FM/BM bypass */
export async function requirePermission(
  permission: Permission
): Promise<SessionPayload> {
  return requirePerm(permission);
}

/** Refresh JWT permissions from DB (call after permission updates). */
export async function refreshStaffSession(userId: string): Promise<void> {
  const session = await getSession();
  if (!session || session.sub !== userId) return;

  const ctx = await getStaffAuthContext(userId);
  if (!ctx) return;

  await setSession({
    ...session,
    permissions: ctx.stored,
  });
}

/** For API route handlers — returns 401/403 response or authorized session. */
export async function authorizeApi(
  permission: Permission | Permission[]
): Promise<{ session: SessionPayload; authContext?: StaffAuthContext } | Response> {
  const { NextResponse } = await import("next/server");
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "PATRON") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.role === "SUPER_ADMIN") {
    return { session };
  }

  const ctx = await getStaffAuthContext(session.sub);
  if (!ctx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const perms = Array.isArray(permission) ? permission : [permission];
  const allowed = perms.some((p) => ctxHasPermission(ctx, p));
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { session, authContext: ctx };
}

export { hasPermission, hasAnyPermission };
