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

function defaultRedirectForRole(role: "PATRON" | "SUPER_ADMIN" | "FACILITY_MANAGER" | "BOOKING_MANAGER" | "VICAR") {
  if (role === "PATRON") return "/patron/dashboard";
  return "/dashboard";
}

// ── Unified Login (Email/Password) ───────────────────────────────────────────

const StaffLoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
});

export async function loginAnyAccount(formData: FormData) {
  const ip = headers().get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { allowed } = await rateLimit(`login:${ip}`, 10, 60);
  if (!allowed) return { error: "Too many attempts. Try again in a minute." };

  const parsed = StaffLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Invalid input." };

  const { email, password } = parsed.data;

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

  const patron = await prisma.patron.findUnique({ where: { email } });
  if (!patron) return { error: "Invalid credentials." };

  const valid = await bcrypt.compare(password, patron.passwordHash);
  if (!valid) return { error: "Invalid credentials." };

  await setSession({ sub: patron.id, role: "PATRON", name: patron.name, email: patron.email });
  auditLog({ userId: patron.id, action: "LOGIN", entity: "Patron", entityId: patron.id });

  return { success: true, role: "PATRON", redirectTo: "/patron/dashboard" };
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

  const { name, email, password, phone } = parsed.data;

  const exists = await prisma.patron.findUnique({ where: { email } });
  if (exists) return { error: "Email already registered." };

  const passwordHash = await bcrypt.hash(password, 12);
  const patron = await prisma.patron.create({
    data: { email, passwordHash, name, phone },
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
  clearSession();
  redirect("/login");
}

// ── Create Staff User ────────────────────────────────────────────────────────

const CreateStaffSchema = z.object({
  name:    z.string().min(2),
  email:   z.string().email(),
  phone:   z.string().min(9, "Phone number is required"),
  role:    z.enum(["SUPER_ADMIN", "FACILITY_MANAGER", "BOOKING_MANAGER", "VICAR"]),
});

export async function createStaffUser(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  // Super admin can create all staff roles; FM can only create vicars/booking managers
  const requestedRole = formData.get("role");
  if (session.role === "FACILITY_MANAGER" && ["FACILITY_MANAGER", "SUPER_ADMIN"].includes(String(requestedRole))) {
    return { error: "Facility Managers can only create Booking Managers or Vicars." };
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

  const tempPassword = `Welcome@${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: { ...parsed.data, passwordHash, mustChangePassword: true },
  });

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`;

  // SMS first (primary)
  await notifyStaffAppointment({
    phone:        parsed.data.phone,
    name:         parsed.data.name,
    role:         parsed.data.role,
    tempPassword: tempPassword,
    loginUrl,
  });
  // Email (secondary)
  await sendStaffAppointmentEmail({
    to:           parsed.data.email,
    name:         parsed.data.name,
    role:         parsed.data.role,
    tempPassword: tempPassword,
    loginUrl,
  });

  auditLog({ userId: session.sub, action: "CREATE_STAFF", entity: "User", entityId: user.id, after: { role: user.role } });

  return { success: true, userId: user.id };
}
