"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { sendSMS } from "@/lib/notifications/sms";
import { sendEmail } from "@/lib/notifications/email";

const CreatePatronSchema = z.object({
  name:  z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(9, "Phone number is required"),
});

const UpdatePatronSchema = z.object({
  name:       z.string().min(2, "Name is required"),
  email:      z.string().email("Valid email required"),
  phone:      z.string().min(9, "Phone number is required"),
  isVerified: z.boolean(),
});

export async function createPatron(data: {
  name: string;
  email: string;
  phone: string;
}) {
  const session = await requireRole("SUPER_ADMIN");

  const parsed = CreatePatronSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  parsed.data.email = parsed.data.email.trim().toLowerCase();

  const existingEmail = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingEmail?.isPatron) return { error: "A patron with this email already exists." };
  const existingPhone = await prisma.user.findFirst({ where: { phone: parsed.data.phone } });
  if (existingPhone && existingPhone.id !== existingEmail?.id) return { error: "Phone number already belongs to another account." };
  if (existingEmail) {
    await prisma.user.update({ where: { id: existingEmail.id }, data: { isPatron: true, isVerified: true } });
    auditLog({ userId: session.sub, action: "ENABLE_PATRON_PROFILE", entity: "User", entityId: existingEmail.id });
    revalidatePath("/users");
    return { success: true };
  }

  const tempPassword = `FLC@${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const patron = await prisma.user.create({
    data: {
      name:       parsed.data.name,
      email:      parsed.data.email,
      phone:      parsed.data.phone,
      passwordHash,
      role: "PATRON",
      isPatron: true,
      isVerified: true,
    },
  });

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/patron/login`;

  // Notify via SMS
  await sendSMS({
    to: parsed.data.phone,
    message: `Hi ${parsed.data.name}, your First Love Center patron account has been created. Login at ${loginUrl} with email: ${parsed.data.email} and temporary password: ${tempPassword}. Please change your password after logging in.`,
  }).catch(() => null);

  // Notify via email
  await sendEmail({
    to: parsed.data.email,
    subject: "Your First Love Center Patron Account",
    html: `<p>Hi ${parsed.data.name},</p><p>Your patron account has been created.</p><p><strong>Login:</strong> ${loginUrl}<br/><strong>Email:</strong> ${parsed.data.email}<br/><strong>Temporary Password:</strong> ${tempPassword}</p><p>Please change your password after logging in.</p>`,
  }).catch(() => null);

  auditLog({ userId: session.sub, action: "CREATE_PATRON", entity: "Patron", entityId: patron.id, after: { name: patron.name, email: patron.email } });
  revalidatePath("/users");
  return { success: true };
}

export async function updatePatron(
  id: string,
  data: { name: string; email: string; phone: string; isVerified: boolean }
) {
  const session = await requireRole("SUPER_ADMIN");

  const parsed = UpdatePatronSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  parsed.data.email = parsed.data.email.trim().toLowerCase();

  // Check email uniqueness
  const emailConflict = await prisma.user.findFirst({
    where: { email: parsed.data.email, NOT: { id } },
  });
  if (emailConflict) return { error: "Email already in use by another patron." };

  // Check phone uniqueness
  const phoneConflict = await prisma.user.findFirst({
    where: { phone: parsed.data.phone, NOT: { id } },
  });
  if (phoneConflict) return { error: "Phone already in use by another patron." };

  const patron = await prisma.user.update({
    where: { id },
    data: {
      name:       parsed.data.name,
      email:      parsed.data.email,
      phone:      parsed.data.phone,
      isVerified: parsed.data.isVerified,
    },
  });

  auditLog({ userId: session.sub, action: "UPDATE_PATRON", entity: "Patron", entityId: id, after: parsed.data });
  revalidatePath("/users");
  return { success: true, patron };
}

export async function deletePatron(id: string) {
  const session = await requireRole("SUPER_ADMIN");

  const activeBookings = await prisma.booking.count({
    where: { patronId: id, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (activeBookings > 0) {
    return { error: `Cannot delete: patron has ${activeBookings} active booking${activeBookings !== 1 ? "s" : ""}.` };
  }

  const account = await prisma.user.findUnique({ where: { id }, select: { role: true, isPatron: true } });
  if (!account?.isPatron) return { error: "Patron not found." };
  if (account.role === "PATRON") {
    await prisma.user.delete({ where: { id } });
  } else {
    await prisma.user.update({ where: { id }, data: { isPatron: false, isVerified: false } });
  }
  auditLog({ userId: session.sub, action: "DELETE_PATRON", entity: "Patron", entityId: id });
  revalidatePath("/users");
  return { success: true };
}

export async function resetPatronPassword(id: string) {
  const session = await requireRole("SUPER_ADMIN");

  const patron = await prisma.user.findFirst({ where: { id, isPatron: true } });
  if (!patron) return { error: "Patron not found." };

  const tempPassword = `FLC@${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.update({ where: { id }, data: { passwordHash } });

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/patron/login`;

  await sendSMS({
    to: patron.phone!,
    message: `Hi ${patron.name}, your First Love Center password has been reset. New temporary password: ${tempPassword}. Login at ${loginUrl}`,
  }).catch(() => null);

  await sendEmail({
    to: patron.email,
    subject: "Your First Love Center Password Has Been Reset",
    html: `<p>Hi ${patron.name},</p><p>Your password has been reset by an administrator.</p><p><strong>Temporary Password:</strong> ${tempPassword}</p><p>Login at: ${loginUrl}</p>`,
  }).catch(() => null);

  auditLog({ userId: session.sub, action: "RESET_PATRON_PASSWORD", entity: "Patron", entityId: id });
  revalidatePath("/users");
  return { success: true };
}
