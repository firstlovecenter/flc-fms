"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { setSession, clearSession, getSession } from "@/lib/auth/session";
import { auditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/redis";
import { headers } from "next/headers";
import { notifyStaffAppointment } from "@/lib/notifications/sms";
import { sendStaffAppointmentEmail } from "@/lib/notifications/email";
import { permissionsToFullStored, resolveStaffPreset } from "@/lib/permissions";
import { Role } from "@prisma/client";

function defaultRedirectForRole(role: "PATRON" | "SUPER_ADMIN" | "FACILITY_MANAGER" | "BOOKING_MANAGER" | "VICAR" | "STAFF") {
  if (role === "PATRON") return "/patron/dashboard";
  return "/dashboard";
}

// ── Unified Login (Email/Password) ───────────────────────────────────────────

const StaffLoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
});

export async function loginAnyAccount(formData: FormData) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { allowed } = await rateLimit(`login:${ip}`, 10, 60);
  if (!allowed) return { error: "Too many attempts. Try again in a minute." };

  const parsed = StaffLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Invalid input." };

  const { password } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.isActive) {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return { error: "Invalid credentials." };

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    await setSession({
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      permissions: user.permissions as Record<string, boolean>,
      mustChangePassword: user.mustChangePassword,
    });

    auditLog({ userId: user.id, action: "LOGIN", entity: "User", entityId: user.id });
    return { success: true, role: user.role, redirectTo: defaultRedirectForRole(user.role) };
  }
  return { error: "Invalid credentials." };
}

export async function loginStaff(formData: FormData) {
  return loginAnyAccount(formData);
}

// ── Patron Register ───────────────────────────────────────────────────────────

const PatronRegisterSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8),
  phone:    z.string().min(9, "Phone number is required"),
});

export async function registerPatron(formData: FormData) {
  const parsed = PatronRegisterSchema.safeParse({
    name:     formData.get("name"),
    email:    formData.get("email"),
    password: formData.get("password"),
    phone:    formData.get("phone") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { name, password, phone } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  const exists = await prisma.user.findUnique({ where: { email } });

  // If the email belongs to an auto-registered (unverified) patron from a guest
  // booking, let them claim the account by setting a real password.
  if (exists && exists.role === "PATRON" && !exists.isVerified) {
    const passwordHash = await bcrypt.hash(password, 12);
    const patron = await prisma.user.update({
      where: { id: exists.id },
      data: { passwordHash, name, phone, isVerified: true },
    });
    await setSession({ sub: patron.id, role: "PATRON", name, email });
    return { success: true, redirectTo: "/patron/dashboard" };
  }

  if (exists) return { error: "This email already belongs to an account. Please sign in instead." };

  const passwordHash = await bcrypt.hash(password, 12);
  const patron = await prisma.user.create({
    data: { email, passwordHash, name, phone, role: "PATRON", isPatron: true, isVerified: true },
  });

  await setSession({ sub: patron.id, role: "PATRON", name, email });
  return { success: true, redirectTo: "/patron/dashboard" };
}

// ── Patron Login ──────────────────────────────────────────────────────────────

export async function loginPatron(formData: FormData) {
  return loginAnyAccount(formData);
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout() {
  const session = await getSession();
  if (session) {
    auditLog({ userId: session.sub, action: "LOGOUT", entity: "User", entityId: session.sub });
  }
  await clearSession();
  redirect("/login");
}

export async function switchToPatronContext() {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };

  const account = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!account?.isActive || !account.isPatron) return { error: "This account does not have patron access." };

  await setSession({ sub: account.id, role: "PATRON", name: account.name, email: account.email });
  auditLog({ userId: account.id, action: "SWITCH_TO_PATRON_CONTEXT", entity: "User", entityId: account.id });
  return { success: true, redirectTo: "/patron/dashboard" };
}

export async function switchToStaffContext() {
  const session = await getSession();
  if (!session) return { error: "Please sign in again." };

  const account = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!account?.isActive || account.role === "PATRON") return { error: "This account does not have staff access." };

  await setSession({
    sub: account.id,
    role: account.role,
    name: account.name,
    email: account.email,
    permissions: account.permissions as Record<string, boolean>,
    mustChangePassword: account.mustChangePassword,
  });
  auditLog({ userId: account.id, action: "SWITCH_TO_STAFF_CONTEXT", entity: "User", entityId: account.id });
  return { success: true, redirectTo: "/dashboard" };
}

// ── Create Staff User ────────────────────────────────────────────────────────

const CreateStaffSchema = z.object({
  name:    z.string().min(2),
  email:   z.string().email(),
  phone:   z.string().min(9, "Phone number is required"),
  role:    z.enum(["SUPER_ADMIN", "FACILITY_MANAGER", "OPERATIONS_NO_FINANCE", "BOOKING_MANAGER", "VICAR"]),
});

export async function createStaffUser(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  // Super admin can create all roles; FM can create any staff preset but not
  // another Facility Manager or Super Admin.
  const requestedRole = formData.get("role");
  if (session.role === "FACILITY_MANAGER" && ["FACILITY_MANAGER", "SUPER_ADMIN"].includes(String(requestedRole))) {
    return { error: "Facility Managers cannot create another Facility Manager or Super Admin." };
  }
  if (session.role !== "SUPER_ADMIN" && requestedRole === "SUPER_ADMIN") {
    return { error: "Only Super Admin can create another Super Admin." };
  }
  if (!["SUPER_ADMIN", "FACILITY_MANAGER"].includes(session.role)) {
    return { error: "Unauthorized" };
  }

  const parsed = CreateStaffSchema.safeParse({
    name:  formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    role:  formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  parsed.data.email = parsed.data.email.trim().toLowerCase();

  const tempPassword = `Welcome@${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  // Map the chosen preset to the DB role + the permission set to seed. Only
  // Facility Manager and Super Admin are real roles; every other preset is a
  // neutral STAFF member with the preset's permissions (editable anytime).
  const { role: dbRole, permissions: permSet } = resolveStaffPreset(parsed.data.role);

  const existingAccount = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingAccount && existingAccount.role !== "PATRON") {
    return { error: "A staff account with this email already exists." };
  }

  const user = existingAccount
    ? await prisma.user.update({
        where: { id: existingAccount.id },
        data: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          role: dbRole as Role,
          ...(permSet ? { permissions: permissionsToFullStored(permSet) } : {}),
        },
      })
    : await prisma.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          role: dbRole as Role,
          passwordHash,
          mustChangePassword: true,
          ...(permSet ? { permissions: permissionsToFullStored(permSet) } : {}),
        },
      });

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`;

  if (!existingAccount) {
    await notifyStaffAppointment({
      phone: parsed.data.phone, name: parsed.data.name, role: parsed.data.role,
      tempPassword, loginUrl,
    });
    await sendStaffAppointmentEmail({
      to: parsed.data.email, name: parsed.data.name, role: parsed.data.role,
      tempPassword, loginUrl,
    });
  }

  auditLog({ userId: session.sub, action: existingAccount ? "PROMOTE_PATRON_TO_STAFF" : "CREATE_STAFF", entity: "User", entityId: user.id, after: { role: user.role } });

  return { success: true, userId: user.id };
}
