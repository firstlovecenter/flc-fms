"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import {
  getSession,
  setSession,
  clearSession,
  getImpersonationBackup,
  setImpersonationBackup,
  clearImpersonationBackup,
} from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";

export async function impersonateUser(userId: string) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return { error: "Unauthorized" };
  }
  if (session.impersonatedBy) {
    return { error: "Already impersonating. Stop the current session first." };
  }
  if (session.sub === userId) {
    return { error: "Cannot impersonate yourself." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, permissions: true, isActive: true },
  });
  if (!target || !target.isActive) return { error: "User not found or inactive." };
  if (target.role === "SUPER_ADMIN") return { error: "Cannot impersonate another Super Admin." };

  // Backup the original SA session so we can restore it later.
  await setImpersonationBackup(session);

  await setSession({
    sub:          target.id,
    role:         target.role,
    name:         target.name,
    email:        target.email,
    permissions:  target.permissions as Record<string, boolean>,
    impersonatedBy: { id: session.sub, name: session.name },
  });

  auditLog({
    userId:   session.sub,
    action:   "IMPERSONATE_START",
    entity:   "User",
    entityId: target.id,
    after:    { targetName: target.name, targetRole: target.role },
  });

  redirect("/dashboard");
}

export async function impersonatePatron(patronId: string) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return { error: "Unauthorized" };
  }
  if (session.impersonatedBy) {
    return { error: "Already impersonating. Stop the current session first." };
  }

  const patron = await prisma.patron.findUnique({
    where: { id: patronId },
    select: { id: true, name: true, email: true },
  });
  if (!patron) return { error: "Patron not found." };

  await setImpersonationBackup(session);

  await setSession({
    sub:            patron.id,
    role:           "PATRON",
    name:           patron.name,
    email:          patron.email,
    impersonatedBy: { id: session.sub, name: session.name },
  });

  auditLog({
    userId:   session.sub,
    action:   "IMPERSONATE_START",
    entity:   "Patron",
    entityId: patron.id,
    after:    { targetName: patron.name, targetRole: "PATRON" },
  });

  redirect("/patron/dashboard");
}

export async function stopImpersonating() {
  const session = await getSession();
  if (!session?.impersonatedBy) return { error: "Not currently impersonating." };

  const backup = await getImpersonationBackup();
  if (!backup || backup.role !== "SUPER_ADMIN") {
    // Safety fallback — something is wrong, clear everything.
    clearSession();
    clearImpersonationBackup();
    redirect("/login");
  }

  const impersonatedId   = session.sub;
  const impersonatedName = session.name;
  const impersonatedRole = session.role;

  await setSession(backup);
  clearImpersonationBackup();

  auditLog({
    userId:   backup.sub,
    action:   "IMPERSONATE_END",
    entity:   impersonatedRole === "PATRON" ? "Patron" : "User",
    entityId: impersonatedId,
    after:    { targetName: impersonatedName, targetRole: impersonatedRole },
  });

  redirect(impersonatedRole === "PATRON" ? "/users" : "/staff");
}
